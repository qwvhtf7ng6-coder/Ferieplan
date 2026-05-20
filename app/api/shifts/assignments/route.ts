import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject, scopeOf } from "@/lib/can";
import { NextRequest, NextResponse } from "next/server";
import { startOfWeek, endOfWeek, addDays } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const subject = buildSubject(user);

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart"); // ISO date string
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

  // Scope-baseret filtrering: ingen shift.assign-scope = kun egne vagter.
  // OWN_DEPARTMENT = egen afdeling. ALL = alt (eller filter fra forespørgsel).
  const assignScope = scopeOf(subject, "shift.assign");
  const whereUser =
    assignScope === "NONE"
      ? { userId: user.id }
      : assignScope === "ALL"
      ? departmentId
        ? { user: { departmentId } }
        : {}
      : { user: { departmentId: user.departmentId } };

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      ...whereUser,
      date: { gte: from, lte: to },
    },
    include: {
      user: { select: { id: true, name: true, departmentId: true } },
      template: {
        include: { department: { select: { name: true } } },
      },
    },
    orderBy: [{ date: "asc" }, { template: { startTime: "asc" } }],
  });

  // Cross-check each assignment against approved absences for the same user/date
  const absenceEntries = await prisma.vacationRequestEntry.findMany({
    where: {
      date: { gte: from, lte: to },
      request: {
        status: "APPROVED",
        userId: { in: [...new Set(assignments.map((a) => a.userId))] },
      },
    },
    select: { date: true, request: { select: { userId: true } } },
  });

  // Build a Set of "userId|yyyy-MM-dd" for fast lookup
  const absenceSet = new Set(
    absenceEntries.map((e) => {
      const dk = new Date(e.date).toISOString().slice(0, 10);
      return `${e.request.userId}|${dk}`;
    })
  );

  const result = assignments.map((a) => {
    const dk = new Date(a.date).toISOString().slice(0, 10);
    return { ...a, hasAbsenceConflict: absenceSet.has(`${a.userId}|${dk}`) };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const subject = buildSubject(user);
  if (!can(subject, "shift.assign")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, templateId, date, note } = await req.json();

  if (!userId || !templateId || !date) {
    return NextResponse.json({ error: "Medarbejder, vagt og dato er påkrævet" }, { status: 400 });
  }

  // Validér dato
  if (isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "Ugyldig dato" }, { status: 400 });
  }

  // Verify template belongs to manager's department
  const template = await prisma.shiftTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Vagtskabelon ikke fundet" }, { status: 404 });
  if (!can(subject, "shift.assign", { targetDepartmentId: template.departmentId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify userId tilhører samme afdeling som template
  // (en bruger fra dept B må ikke tildeles dept A's template — også selvom admin)
  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true } });
  if (!targetUser) {
    return NextResponse.json({ error: "Medarbejder ikke fundet" }, { status: 404 });
  }
  if (targetUser.departmentId !== template.departmentId) {
    return NextResponse.json({ error: "Medarbejder tilhører ikke skabelonens afdeling" }, { status: 403 });
  }

  // Check if user has approved absence on this date
  const dateObj = new Date(date);
  const dayStart = new Date(dateObj.setHours(0, 0, 0, 0));
  const dayEnd = new Date(dateObj.setHours(23, 59, 59, 999));

  const conflictingAbsence = await prisma.vacationRequestEntry.findFirst({
    where: {
      date: { gte: dayStart, lte: dayEnd },
      request: { userId, status: "APPROVED" },
    },
  });

  const assignment = await prisma.shiftAssignment.upsert({
    where: { userId_date_templateId: { userId, date: new Date(date), templateId } },
    update: { note: note || null },
    create: {
      userId,
      templateId,
      date: new Date(date),
      note: note || null,
    },
    include: {
      user: { select: { id: true, name: true } },
      template: true,
    },
  });

  return NextResponse.json(
    { ...assignment, hasAbsenceConflict: !!conflictingAbsence },
    { status: 201 }
  );
}
