import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const deptId = searchParams.get("departmentId");
  const status = searchParams.get("status");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  let where: any = {};

  if (user.role === "EMPLOYEE") {
    where.userId = user.id;
  } else if (user.role === "MANAGER") {
    where.departmentId = user.departmentId;
  }
  // ADMIN sees all unless filtered

  if (deptId && user.role === "ADMIN") where.departmentId = deptId;
  if (status) where.status = status;

  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.entries = { some: { date: { gte: start, lte: end } } };
  }

  const requests = await prisma.vacationRequest.findMany({
    where,
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { name: true, email: true } },
      department: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  if (!user.departmentId) {
    return NextResponse.json({ error: "Ingen afdeling tilknyttet" }, { status: 400 });
  }

  const body = await req.json();
  const { entries, note } = body;

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "Mindst én dato påkrævet" }, { status: 400 });
  }

  for (const e of entries) {
    if (!e.date) return NextResponse.json({ error: "Ugyldig dato" }, { status: 400 });
  }

  const entryData = entries.map((e: any) => ({
    date: new Date(e.date),
    type: e.type || "FULL_DAY",
    days: e.type === "HALF_DAY_AM" || e.type === "HALF_DAY_PM" ? 0.5 : 1,
  }));

  const request = await prisma.vacationRequest.create({
    data: {
      userId: user.id,
      departmentId: user.departmentId,
      note: note || null,
      entries: { create: entryData },
    },
    include: { entries: true },
  });

  await createAuditLog({
    userId: user.id,
    requestId: request.id,
    action: "CREATE",
    details: `Oprettet med ${entries.length} datolinjer`,
  });

  return NextResponse.json(request, { status: 201 });
}
