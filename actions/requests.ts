"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { entryTypeToDays } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import {
  notifyManagersOfNewRequest,
  notifyAdminsOfNewRequest,
} from "@/lib/notifications";
import type {
  ActionResult,
  CreateRequestInput,
  SessionUser,
  VacationRequestRow,
} from "@/types";

async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
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
    absenceType: e.absenceType,
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


