"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { canManageDepartment, isManager } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import type {
  ActionResult,
  CapacityCheckResult,
  SessionUser,
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

export async function getManagerRequests(filters?: {
  status?: string;
  month?: number;
  year?: number;
  departmentId?: string;
}): Promise<ActionResult<VacationRequestRow[]>> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };
  if (!isManager(user.role)) return { ok: false, error: "Ingen adgang" };

  const where: Record<string, unknown> = {};

  if (user.role === "MANAGER") {
    where.departmentId = user.departmentId;
  } else if (filters?.departmentId) {
    where.departmentId = filters.departmentId;
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
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return { ok: true, data: requests as unknown as VacationRequestRow[] };
}

export async function approveRequest(
  requestId: string
): Promise<ActionResult<{ capacityWarning?: string }>> {
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
  if (request.status !== "PENDING") {
    return { ok: false, error: "Kun afventende ansøgninger kan godkendes" };
  }

  const capacity = await checkCapacity(
    request.departmentId,
    request.entries.map((e: { date: Date }) => ({ date: e.date })),
    requestId
  );

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" },
  });

  await createAuditLog({
    userId: user.id,
    requestId,
    action: "APPROVED",
    details: capacity.exceeded
      ? `Kapacitetsadvarsel: ${capacity.date} (${capacity.current}/${capacity.max})`
      : undefined,
  });

  revalidatePath("/manager/requests");
  revalidatePath("/manager/calendar");
  revalidatePath("/dashboard");

  return {
    ok: true,
    data: capacity.exceeded
      ? {
          capacityWarning: `Kapacitetsgrænse overskredet for ${capacity.date} (${capacity.current}/${capacity.max} godkendt)`,
        }
      : {},
  };
}

export async function rejectRequest(
  requestId: string,
  reason?: string
): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };

  const request = await prisma.vacationRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, error: "Ansøgning ikke fundet" };
  if (!canManageDepartment(user.role, user.departmentId, request.departmentId)) {
    return { ok: false, error: "Ingen adgang til denne afdeling" };
  }
  if (request.status !== "PENDING") {
    return { ok: false, error: "Kun afventende ansøgninger kan afvises" };
  }

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" },
  });

  await createAuditLog({
    userId: user.id,
    requestId,
    action: "REJECTED",
    details: reason?.trim() || undefined,
  });

  revalidatePath("/manager/requests");
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function cancelRequestAsManager(
  requestId: string
): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };

  const request = await prisma.vacationRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, error: "Ansøgning ikke fundet" };
  if (!canManageDepartment(user.role, user.departmentId, request.departmentId)) {
    return { ok: false, error: "Ingen adgang til denne afdeling" };
  }
  if (!["PENDING", "APPROVED"].includes(request.status)) {
    return { ok: false, error: "Kan ikke annullere en afvist eller allerede annulleret ansøgning" };
  }

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });

  await createAuditLog({
    userId: user.id,
    requestId,
    action: "CANCELLED",
    details: `Annulleret af ${user.role === "ADMIN" ? "admin" : "leder"}`,
  });

  revalidatePath("/manager/requests");
  revalidatePath("/manager/calendar");
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function editRequestNote(
  requestId: string,
  note: string
): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };

  const request = await prisma.vacationRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, error: "Ansøgning ikke fundet" };
  if (!canManageDepartment(user.role, user.departmentId, request.departmentId)) {
    return { ok: false, error: "Ingen adgang til denne afdeling" };
  }

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { note: note.trim() || null },
  });

  await createAuditLog({
    userId: user.id,
    requestId,
    action: "EDITED",
    details: `Note opdateret`,
  });

  revalidatePath("/manager/requests");

  return { ok: true };
}

export async function getRequestWithAudit(requestId: string): Promise<
  ActionResult<{
    request: VacationRequestRow;
    auditLogs: {
      id: string;
      action: string;
      details: string | null;
      createdAt: Date;
      user: { name: string };
    }[];
  }>
> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };
  if (!isManager(user.role)) return { ok: false, error: "Ingen adgang" };

  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true, maxConcurrent: true } },
    },
  });
  if (!request) return { ok: false, error: "Ikke fundet" };

  if (!canManageDepartment(user.role, user.departmentId, request.departmentId)) {
    return { ok: false, error: "Ingen adgang" };
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: { requestId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return {
    ok: true,
    data: {
      request: request as unknown as VacationRequestRow,
      auditLogs,
    },
  };
}
