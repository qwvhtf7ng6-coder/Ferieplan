import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject, scopeOf } from "@/lib/can";
import { NextRequest, NextResponse } from "next/server";
import { startOfWeek, endOfWeek, addDays } from "date-fns";
import { toISODate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  const subject = buildSubject(user);

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  const departmentId = searchParams.get("departmentId");

  let from: Date;
  let to: Date;
  if (weekStart) {
    from = new Date(weekStart);
    to = addDays(from, 6);
  } else {
    from = startOfWeek(new Date(), { weekStartsOn: 1 });
    to = endOfWeek(new Date(), { weekStartsOn: 1 });
  }

  const assignScope = scopeOf(subject, "shift.assign");
  const whereUser =
    assignScope === "NONE"
      ? { userId: user.id }
      : assignScope === "ALL"
      ? departmentId ? { user: { departmentId } } : {}
      : { user: { departmentId: user.departmentId } };

  const assignments = await prisma.shiftAssignment.findMany({
    where: { organizationId: orgId, ...whereUser, date: { gte: from, lte: to } },
    include: {
      user: { select: { id: true, name: true, departmentId: true } },
      template: { include: { department: { select: { name: true } } } },
    },
    orderBy: [{ date: "asc" }, { template: { startTime: "asc" } }],
  });

  const absenceEntries = await prisma.vacationRequestEntry.findMany({
    where: {
      date: { gte: from, lte: to },
      request: {
        organizationId: orgId,
        status: "APPROVED",
        userId: { in: [...new Set((assignments as any[]).map((a) => a.userId))] },
      },
    },
    select: { date: true, request: { select: { userId: true } } },
  });

  const absenceSet = new Set(
    (absenceEntries as any[]).map((e) => {
      const dk = toISODate(e.date);
      return `${e.request.userId}|${dk}`;
    })
  );

  const result = (assignments as any[]).map((a) => {
    const dk = toISODate(a.date);
    return { ...a, hasAbsenceConflict: absenceSet.has(`${a.userId}|${dk}`) };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  const subject = buildSubject(user);
  if (!can(subject, "shift.assign")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, templateId, date, note } = await req.json();
  if (!userId || !templateId || !date) {
    return NextResponse.json({ error: "Medarbejder, vagt og dato er påkrævet" }, { status: 400 });
  }
  if (isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "Ugyldig dato" }, { status: 400 });
  }

  const template = await prisma.shiftTemplate.findFirst({ where: { id: templateId, organizationId: orgId } });
  if (!template) return NextResponse.json({ error: "Vagtskabelon ikke fundet" }, { status: 404 });
  if (!can(subject, "shift.assign", { targetDepartmentId: template.departmentId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetUser = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId }, select: { departmentId: true } });
  if (!targetUser) return NextResponse.json({ error: "Medarbejder ikke fundet" }, { status: 404 });
  if (targetUser.departmentId !== template.departmentId) {
    return NextResponse.json({ error: "Medarbejder tilhører ikke skabelonens afdeling" }, { status: 403 });
  }

  const dateObj = new Date(date);
  const dayStart = new Date(dateObj.setHours(0, 0, 0, 0));
  const dayEnd = new Date(dateObj.setHours(23, 59, 59, 999));

  const conflictingAbsence = await prisma.vacationRequestEntry.findFirst({
    where: { date: { gte: dayStart, lte: dayEnd }, request: { organizationId: orgId, userId, status: "APPROVED" } },
  });

  const assignment = await prisma.shiftAssignment.upsert({
    where: { userId_date_templateId: { userId, date: new Date(date), templateId } },
    update: { note: note || null },
    create: { organizationId: orgId, userId, templateId, date: new Date(date), note: note || null },
    include: { user: { select: { id: true, name: true } }, template: true },
  });

  return NextResponse.json({ ...assignment, hasAbsenceConflict: !!conflictingAbsence }, { status: 201 });
}
