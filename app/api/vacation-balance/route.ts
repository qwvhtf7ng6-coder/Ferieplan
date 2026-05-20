import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/vacation-balance?year=2025 — own balance
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()));

  const [balance, usedResult] = await Promise.all([
    prisma.vacationBalance.findUnique({
      where: { userId_year: { userId: user.id, year } },
    }),
    prisma.vacationRequestEntry.aggregate({
      where: {
        absenceType: "VACATION",
        request: {
          userId: user.id,
          status: "APPROVED",
          entries: {
            some: {
              date: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`),
              },
            },
          },
        },
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      _sum: { days: true },
    }),
  ]);

  const totalDays = (balance?.totalDays ?? 25) + (balance?.carryOverDays ?? 0);
  const usedDays = usedResult._sum.days ?? 0;
  const remainingDays = totalDays - usedDays;

  return NextResponse.json({
    year,
    totalDays: balance?.totalDays ?? 25,
    carryOverDays: balance?.carryOverDays ?? 0,
    usedDays,
    remainingDays,
    note: balance?.note ?? null,
  });
}
