"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import type { SessionUser } from "@/types";

async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

function usedDaysQuery(orgId: string, userId: string, year: number) {
  return prisma.vacationRequestEntry.aggregate({
    where: {
      absenceType: "VACATION",
      date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) },
      request: { organizationId: orgId, userId, status: "APPROVED" },
    },
    _sum: { days: true },
  });
}

export async function getMyVacationBalance(year?: number) {
  const user = await getSession();
  if (!user) return { ok: false as const, error: "Ikke logget ind" };
  const orgId = (user as any).organizationId as string;

  const y = year ?? new Date().getFullYear();

  const [balance, usedResult] = await Promise.all([
    prisma.vacationBalance.findUnique({ where: { userId_year: { userId: user.id, year: y } } }),
    usedDaysQuery(orgId, user.id, y),
  ]);

  const totalDays = balance?.totalDays ?? 25;
  const carryOverDays = balance?.carryOverDays ?? 0;
  const usedDays = usedResult._sum.days ?? 0;

  return {
    ok: true as const,
    data: {
      year: y,
      totalDays,
      carryOverDays,
      allottedDays: totalDays + carryOverDays,
      usedDays,
      remainingDays: totalDays + carryOverDays - usedDays,
      note: balance?.note ?? null,
    },
  };
}

export async function getAllVacationBalances(year?: number) {
  const user = await getSession();
  if (!user) return { ok: false as const, error: "Ikke logget ind" };
  const orgId = (user as any).organizationId as string;
  const subject = buildSubject(user);
  if (!can(subject, "balance.view_others")) {
    return { ok: false as const, error: "Ingen adgang" };
  }

  const y = year ?? new Date().getFullYear();

  const scope = subject.permissions["balance.view_others"];
  const userWhere =
    scope === "OWN_DEPARTMENT"
      ? { organizationId: orgId, departmentId: user.departmentId ?? undefined }
      : { organizationId: orgId };

  const users = await prisma.user.findMany({
    where: userWhere,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: { select: { name: true } },
      vacationBalances: {
        where: { year: y },
        select: { totalDays: true, carryOverDays: true, note: true },
      },
    },
  });

  // Optimize N+1 query: Fetch all used days for these users in a single query
  // and group them in memory, avoiding N queries inside a Promise.all
  const userIds = users.map((u) => u.id);
  const usedEntries = await prisma.vacationRequestEntry.findMany({
    where: {
      absenceType: "VACATION",
      date: { gte: new Date(`${y}-01-01`), lte: new Date(`${y}-12-31`) },
      request: { organizationId: orgId, userId: { in: userIds }, status: "APPROVED" },
    },
    select: { days: true, request: { select: { userId: true } } },
  });

  const usedDaysMap = new Map<string, number>();
  for (const entry of usedEntries) {
    const uid = entry.request.userId;
    usedDaysMap.set(uid, (usedDaysMap.get(uid) ?? 0) + entry.days);
  }

  const data = (users as Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department: { name: string } | null;
    vacationBalances: Array<{ totalDays: number; carryOverDays: number; note: string | null }>;
  }>).map((u) => {
    const bal = u.vacationBalances[0];
    const totalDays = bal?.totalDays ?? 25;
    const carryOverDays = bal?.carryOverDays ?? 0;
    const usedDays = usedDaysMap.get(u.id) ?? 0;
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department?.name ?? null,
      year: y,
      totalDays,
      carryOverDays,
      allottedDays: totalDays + carryOverDays,
      usedDays,
      remainingDays: totalDays + carryOverDays - usedDays,
      note: bal?.note ?? null,
    };
  });

  return { ok: true as const, data };
}
