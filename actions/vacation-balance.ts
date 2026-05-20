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

function usedDaysQuery(userId: string, year: number) {
  return prisma.vacationRequestEntry.aggregate({
    where: {
      absenceType: "VACATION",
      date: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
      request: {
        userId,
        status: "APPROVED",
      },
    },
    _sum: { days: true },
  });
}

// Get own vacation balance
export async function getMyVacationBalance(year?: number) {
  const user = await getSession();
  if (!user) return { ok: false as const, error: "Ikke logget ind" };

  const y = year ?? new Date().getFullYear();

  const [balance, usedResult] = await Promise.all([
    prisma.vacationBalance.findUnique({
      where: { userId_year: { userId: user.id, year: y } },
    }),
    usedDaysQuery(user.id, y),
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

// Admin/Manager: get all users with balances for a given year (scope-filtered)
export async function getAllVacationBalances(year?: number) {
  const user = await getSession();
  if (!user) return { ok: false as const, error: "Ikke logget ind" };
  const subject = buildSubject(user);
  if (!can(subject, "balance.view_others")) {
    return { ok: false as const, error: "Ingen adgang" };
  }

  const y = year ?? new Date().getFullYear();

  // Scope-baseret filtrering af brugerlisten
  const scope = subject.permissions["balance.view_others"];
  const userWhere = scope === "OWN_DEPARTMENT"
    ? { departmentId: user.departmentId ?? undefined }
    : {};

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

  // Get used days for all users in parallel
  const usedResults = await Promise.all(
    users.map((u) => usedDaysQuery(u.id, y))
  );

  const data = users.map((u, i) => {
    const bal = u.vacationBalances[0];
    const totalDays = bal?.totalDays ?? 25;
    const carryOverDays = bal?.carryOverDays ?? 0;
    const usedDays = usedResults[i]._sum.days ?? 0;
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
