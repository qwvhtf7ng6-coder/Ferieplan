import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isManager } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{ userId: string }>;
}

// GET /api/vacation-balance/[userId]?year=2025
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user as any;
  if (!isAdmin(actor.role) && !isManager(actor.role) && actor.id !== (await params).userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()));

  const [balance, usedResult] = await Promise.all([
    prisma.vacationBalance.findUnique({
      where: { userId_year: { userId, year } },
    }),
    prisma.vacationRequestEntry.aggregate({
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
    }),
  ]);

  const totalDays = (balance?.totalDays ?? 25) + (balance?.carryOverDays ?? 0);
  const usedDays = usedResult._sum.days ?? 0;

  return NextResponse.json({
    year,
    totalDays: balance?.totalDays ?? 25,
    carryOverDays: balance?.carryOverDays ?? 0,
    usedDays,
    remainingDays: totalDays - usedDays,
    note: balance?.note ?? null,
  });
}

// PUT /api/vacation-balance/[userId] — admin sets balance
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user as any;
  if (!isAdmin(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const { year, totalDays, carryOverDays, note } = await req.json();

  if (!year || totalDays === undefined) {
    return NextResponse.json({ error: "year og totalDays er påkrævet" }, { status: 400 });
  }
  if (totalDays < 0 || totalDays > 365) {
    return NextResponse.json({ error: "totalDays skal være mellem 0 og 365" }, { status: 400 });
  }
  if ((carryOverDays ?? 0) < 0) {
    return NextResponse.json({ error: "carryOverDays kan ikke være negativ" }, { status: 400 });
  }

  // Verify user exists
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "Bruger ikke fundet" }, { status: 404 });

  const balance = await prisma.vacationBalance.upsert({
    where: { userId_year: { userId, year } },
    create: { userId, year, totalDays, carryOverDays: carryOverDays ?? 0, note: note ?? null },
    update: { totalDays, carryOverDays: carryOverDays ?? 0, note: note ?? null },
  });

  return NextResponse.json(balance);
}
