"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { canManageDepartment, isManager } from "@/lib/permissions";
import { entryTypeToDays } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import {
  notifyManagersOfNewRequest,
  notifyAdminsOfNewRequest,
} from "@/lib/notifications";
import type {
  ActionResult,
  CapacityCheckResult,
  CreateRequestInput,
  SessionUser,
  UpdateRequestInput,
  VacationRequestRow,
} from "@/types";

async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

async function checkCapacity(
  departmentId: string,
  entries: { date: Date }[],
  excludeRequestId?: string
): Promise<CapacityCheckResult> {
  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept) return { exceeded: false };

  for (const entry of entries) {
    const count = await prisma.vacationRequestEntry.count({
      where: {
        date: entry.date,
        request: {
          departmentId,
          status: "APPROVED",
          ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
        },
      },
    });

    if (count + 1 > dept.maxConcurrent) {
      return {
        exceeded: true,
        date: entry.date.toISOString().slice(0, 10),
        current: count,
        max: dept.maxConcurrent,
      };
    }
  }

  return { exceeded: false };
}

export async function createVacationRequest(
  input: CreateRequestInput
): Promise<ActionResult<{ id: string }>> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };
  if (!user.departmentId) return { ok: false, error: "Ingen afdeling tilknyttet" };

  if (!input.entries || input.entries.length === 0) {
    return { ok: false, error: "Mindst én dato er påkrævet" };
  }

  for (const e of input.entries) {
    if (!e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      return { ok: false, error: `Ugyldig dato: ${e.date}` };
    }
  }

  const entryData = input.entries.map((e) => ({
    date: new Date(e.date),
    type: e.type,
    days: entryTypeToDays(e.type),
  }));

  const request = await prisma.vacationRequest.create({
    data: {
      userId: user.id,
      departmentId: user.departmentId,
      note: input.note?.trim() || null,
      entries: { create: entryData },
    },
  });

  await createAuditLog({
    userId: user.id,
    requestId: request.id,
    action: "CREATE",
    details: `${input.entries.length} datolinjer`,
  });

  // Notify managers + admins (best-effort, don't block)
  const userName = user.name ?? "En medarbejder";
  const deptId = user.departmentId;
  Promise.all([
    notifyManagersOfNewRequest(request.id, deptId, userName),
    notifyAdminsOfNewRequest(request.id, deptId, userName, []),
  ]).catch(() => {/* silent */});

  revalidatePath("/dashboard");
  revalidatePath("/manager/requests");

  return { ok: true, data: { id: request.id } };
}

export async function updateRequestStatus(
  requestId: string,
  input: UpdateRequestInput
): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };

  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
    include: { entries: true },
  });

  if (!request) return { ok: false, error: "Ansøgning ikke fundet" };

  if (!canManageDepartment(user.role, user.departmentId, request.departmentId)) {
    return { ok: false, error: "Ingen adgang til denne afdeling" };
  }

  let capacityWarning: string | undefined;

  if (input.status === "APPROVED") {
    const result = await checkCapacity(
      request.departmentId,
      request.entries.map((e: { date: Date }) => ({ date: e.date })),
      requestId
    );
    if (result.exceeded) {
      capacityWarning = `Kapacitetsgrænse overskredet for ${result.date} (${result.current}/${result.max} godkendt)`;
    }
  }

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: {
      ...(input.status && { status: input.status }),
      ...(input.note !== undefined && { note: input.note }),
    },
  });

  await createAuditLog({
    userId: user.id,
    requestId,
    action: input.status ?? "UPDATE",
    details: capacityWarning,
  });

  revalidatePath("/manager/requests");
  revalidatePath("/dashboard");
  revalidatePath("/manager/calendar");

  return { ok: true, capacityWarning };
}

export async function cancelOwnRequest(requestId: string): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };

  const request = await prisma.vacationRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, error: "Ikke fundet" };
  if (request.userId !== user.id) return { ok: false, error: "Ingen adgang" };
  if (request.status !== "PENDING") {
    return { ok: false, error: "Kun afventende ansøgninger kan annulleres" };
  }

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });

  await createAuditLog({ userId: user.id, requestId, action: "CANCELLED" });

  revalidatePath("/dashboard");

  return { ok: true };
}

export async function getMyRequests(): Promise<ActionResult<VacationRequestRow[]>> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };

  const requests = await prisma.vacationRequest.findMany({
    where: { userId: user.id },
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true, maxConcurrent: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { ok: true, data: requests as unknown as VacationRequestRow[] };
}

export async function getDepartmentRequests(filters?: {
  status?: string;
  month?: number;
  year?: number;
}): Promise<ActionResult<VacationRequestRow[]>> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };
  if (!isManager(user.role)) return { ok: false, error: "Ingen adgang" };

  const where: Record<string, unknown> = {};

  if (!isManager(user.role) || user.role === "MANAGER") {
    where.departmentId = user.departmentId;
  }

  if (filters?.status) where.status = filters.status;

  if (filters?.month && filters?.year) {
    const start = new Date(filters.year, filters.month - 1, 1);
    const end = new Date(filters.year, filters.month, 0, 23, 59, 59);
    where.entries = { some: { date: { gte: start, lte: end } } };
  }

  const requests = await prisma.vacationRequest.findMany({
    where,
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true, maxConcurrent: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { ok: true, data: requests as unknown as VacationRequestRow[] };
}

export async function getRequestAuditLog(
  requestId: string
): Promise<ActionResult<{ id: string; action: string; details: string | null; createdAt: Date; user: { name: string } }[]>> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };
  if (!isManager(user.role)) return { ok: false, error: "Ingen adgang" };

  const logs = await prisma.auditLog.findMany({
    where: { requestId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return { ok: true, data: logs };
}
