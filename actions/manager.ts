"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { can, buildSubject, type PermissionSubject } from "@/lib/can";
import { revalidatePath } from "next/cache";
import { notifyEmployeeOfDecision } from "@/lib/notifications";
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

async function getSessionAndSubject(): Promise<
  { user: SessionUser; subject: PermissionSubject; orgId: string } | null
> {
  const user = await getSession();
  if (!user) return null;
  const orgId = (user as any).organizationId as string;
  if (!orgId) return null;
  return { user, subject: buildSubject(user), orgId };
}

async function checkCapacity(
  orgId: string,
  departmentId: string,
  entries: { date: Date }[],
  excludeRequestId?: string
): Promise<CapacityCheckResult> {
  const dept = await prisma.department.findFirst({ where: { id: departmentId, organizationId: orgId } });
  if (!dept) return { exceeded: false };

  const dates = entries.map((e) => e.date);

  // ⚡ Bolt: Optimization - Fetch all overlapping approved entries in a single query to avoid N+1 queries.
  // Expected impact: Reduces database queries from N to 1 when approving a request with N days.
  const existingEntries = await prisma.vacationRequestEntry.findMany({
    where: {
      date: { in: dates },
      request: {
        organizationId: orgId,
        departmentId,
        status: "APPROVED",
        ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
      },
    },
    select: { date: true },
  });

  const countByDate: Record<string, number> = {};
  for (const entry of existingEntries) {
    const key = entry.date.toISOString().slice(0, 10);
    countByDate[key] = (countByDate[key] || 0) + 1;
  }

  for (const entry of entries) {
    const key = entry.date.toISOString().slice(0, 10);
    const count = countByDate[key] || 0;
    if (count + 1 > dept.maxConcurrent) {
      return { exceeded: true, date: key, current: count, max: dept.maxConcurrent };
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
  const ctx = await getSessionAndSubject();
  if (!ctx) return { ok: false, error: "Ikke logget ind" };
  const { user, subject, orgId } = ctx;

  if (!can(subject, "application.view_others")) {
    return { ok: false, error: "Ingen adgang" };
  }

  const where: Record<string, unknown> = { organizationId: orgId };

  const scope = subject.permissions["application.view_others"];
  if (scope === "OWN_DEPARTMENT") {
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
  requestId: string,
  options?: { confirmOverride?: boolean }
): Promise<ActionResult<{ capacityWarning?: string }>> {
  const ctx = await getSessionAndSubject();
  if (!ctx) return { ok: false, error: "Ikke logget ind" };
  const { user, subject, orgId } = ctx;

  const request = await prisma.vacationRequest.findFirst({
    where: { id: requestId, organizationId: orgId },
    include: { entries: true },
  });
  if (!request) return { ok: false, error: "Ansøgning ikke fundet" };

  if (!can(subject, "approval.decide", { targetDepartmentId: request.departmentId })) {
    return { ok: false, error: "Ingen adgang til denne afdeling" };
  }
  if (request.status !== "PENDING") {
    return { ok: false, error: "Kun afventende ansøgninger kan godkendes" };
  }

  const capacity = await checkCapacity(
    orgId,
    request.departmentId,
    request.entries.map((e: { date: Date }) => ({ date: e.date })),
    requestId
  );

  if (capacity.exceeded) {
    const mayOverride = can(subject, "approval.override_capacity");
    if (!mayOverride) {
      return {
        ok: false,
        error: `Kapacitetsgrænse overskredet for ${capacity.date} (${capacity.current}/${capacity.max}). Du har ikke tilladelse til at trumfe advarslen.`,
      };
    }
    if (!options?.confirmOverride) {
      return {
        ok: true,
        data: {
          capacityWarning: `Kapacitetsgrænse overskredet for ${capacity.date} (${capacity.current}/${capacity.max} godkendt)`,
        },
      };
    }
  }

  await prisma.vacationRequest.update({ where: { id: requestId }, data: { status: "APPROVED" } });

  await createAuditLog({
    organizationId: orgId,
    userId: user.id,
    requestId,
    action: "APPROVED",
    details: capacity.exceeded
      ? `Kapacitetsadvarsel trumfet: ${capacity.date} (${capacity.current}/${capacity.max})`
      : undefined,
  });

  if (request.userId) notifyEmployeeOfDecision(orgId, requestId, request.userId, "REQUEST_APPROVED", user.name ?? "Leder").catch(() => {});

  revalidatePath("/manager/requests");
  revalidatePath("/manager/calendar");
  revalidatePath("/dashboard");

  return { ok: true, data: {} };
}

export async function rejectRequest(requestId: string, reason?: string): Promise<ActionResult> {
  const ctx = await getSessionAndSubject();
  if (!ctx) return { ok: false, error: "Ikke logget ind" };
  const { user, subject, orgId } = ctx;

  const request = await prisma.vacationRequest.findFirst({ where: { id: requestId, organizationId: orgId } });
  if (!request) return { ok: false, error: "Ansøgning ikke fundet" };
  if (!can(subject, "approval.decide", { targetDepartmentId: request.departmentId })) {
    return { ok: false, error: "Ingen adgang til denne afdeling" };
  }
  if (request.status !== "PENDING") {
    return { ok: false, error: "Kun afventende ansøgninger kan afvises" };
  }

  const trimmedReason = reason?.trim() || null;

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", rejectionReason: trimmedReason },
  });

  await createAuditLog({ organizationId: orgId, userId: user.id, requestId, action: "REJECTED", details: trimmedReason || undefined });

  if (request.userId) notifyEmployeeOfDecision(orgId, requestId, request.userId, "REQUEST_REJECTED", user.name ?? "Leder", trimmedReason ?? undefined).catch(() => {});

  revalidatePath("/manager/requests");
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function cancelRequestAsManager(requestId: string): Promise<ActionResult> {
  const ctx = await getSessionAndSubject();
  if (!ctx) return { ok: false, error: "Ikke logget ind" };
  const { user, subject, orgId } = ctx;

  const request = await prisma.vacationRequest.findFirst({ where: { id: requestId, organizationId: orgId } });
  if (!request) return { ok: false, error: "Ansøgning ikke fundet" };
  if (!can(subject, "application.cancel_others", { targetDepartmentId: request.departmentId })) {
    return { ok: false, error: "Ingen adgang til denne afdeling" };
  }
  if (!["PENDING", "APPROVED"].includes(request.status)) {
    return { ok: false, error: "Kan ikke annullere en afvist eller allerede annulleret ansøgning" };
  }

  await prisma.vacationRequest.update({ where: { id: requestId }, data: { status: "CANCELLED" } });

  await createAuditLog({
    organizationId: orgId,
    userId: user.id,
    requestId,
    action: "CANCELLED",
    details: `Annulleret af ${user.role === "ADMIN" ? "admin" : "leder"}`,
  });

  if (request.userId) notifyEmployeeOfDecision(orgId, requestId, request.userId, "REQUEST_CANCELLED", user.name ?? "Leder").catch(() => {});

  revalidatePath("/manager/requests");
  revalidatePath("/manager/calendar");
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function editRequestNote(requestId: string, note: string): Promise<ActionResult> {
  const ctx = await getSessionAndSubject();
  if (!ctx) return { ok: false, error: "Ikke logget ind" };
  const { user, subject, orgId } = ctx;

  const request = await prisma.vacationRequest.findFirst({ where: { id: requestId, organizationId: orgId } });
  if (!request) return { ok: false, error: "Ansøgning ikke fundet" };
  if (!can(subject, "approval.decide", { targetDepartmentId: request.departmentId })) {
    return { ok: false, error: "Ingen adgang til denne afdeling" };
  }

  await prisma.vacationRequest.update({ where: { id: requestId }, data: { note: note.trim() || null } });

  await createAuditLog({ organizationId: orgId, userId: user.id, requestId, action: "EDITED", details: "Note opdateret" });

  if (request.userId) notifyEmployeeOfDecision(orgId, requestId, request.userId, "REQUEST_EDITED", user.name ?? "Leder").catch(() => {});

  revalidatePath("/manager/requests");
  return { ok: true };
}

export async function getRequestWithAudit(requestId: string): Promise<
  ActionResult<{
    request: VacationRequestRow;
    auditLogs: { id: string; action: string; details: string | null; createdAt: Date; user: { name: string } }[];
  }>
> {
  const ctx = await getSessionAndSubject();
  if (!ctx) return { ok: false, error: "Ikke logget ind" };
  const { subject, orgId } = ctx;
  if (!can(subject, "application.view_others")) return { ok: false, error: "Ingen adgang" };

  const request = await prisma.vacationRequest.findFirst({
    where: { id: requestId, organizationId: orgId },
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true, maxConcurrent: true } },
    },
  });
  if (!request) return { ok: false, error: "Ikke fundet" };

  if (!can(subject, "application.view_others", { targetDepartmentId: request.departmentId })) {
    return { ok: false, error: "Ingen adgang" };
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: { requestId, organizationId: orgId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return { ok: true, data: { request: request as unknown as VacationRequestRow, auditLogs } };
}

export async function createRequestOnBehalf(input: {
  targetUserId: string;
  entries: { date: string; type: string; absenceType: string }[];
  note?: string;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getSessionAndSubject();
  if (!ctx) return { ok: false, error: "Ikke logget ind" };
  const { user, subject, orgId } = ctx;
  if (!can(subject, "application.create_on_behalf")) return { ok: false, error: "Ingen adgang" };

  const targetUser = await prisma.user.findFirst({
    where: { id: input.targetUserId, organizationId: orgId },
    select: { id: true, name: true, departmentId: true },
  });
  if (!targetUser) return { ok: false, error: "Medarbejder ikke fundet" };
  if (!targetUser.departmentId) return { ok: false, error: "Medarbejder mangler afdeling" };

  if (!can(subject, "application.create_on_behalf", { targetDepartmentId: targetUser.departmentId })) {
    return { ok: false, error: "Ingen adgang til denne afdeling" };
  }

  if (!input.entries || input.entries.length === 0) {
    return { ok: false, error: "Mindst én dato er påkrævet" };
  }

  const request = await prisma.vacationRequest.create({
    data: {
      organizationId: orgId,
      userId: targetUser.id,
      departmentId: targetUser.departmentId,
      note: input.note?.trim() || null,
      status: "APPROVED",
      entries: {
        create: input.entries.map((e) => ({
          date: new Date(e.date),
          type: e.type as any,
          absenceType: e.absenceType as any,
          days: e.type === "HALF_DAY_AM" || e.type === "HALF_DAY_PM" ? 0.5 : 1,
        })),
      },
    },
  });

  await createAuditLog({
    organizationId: orgId,
    userId: user.id,
    requestId: request.id,
    action: "CREATED_ON_BEHALF",
    details: `Oprettet på vegne af ${targetUser.name} af ${user.name}`,
  });

  revalidatePath("/manager/requests");
  revalidatePath("/dashboard");

  return { ok: true, data: { id: request.id } };
}
