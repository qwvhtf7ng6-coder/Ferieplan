import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManager, isAdmin, canEditShifts } from "@/lib/permissions";
import { isValidRecurrenceType, isValidIntervalWeeks, isValidDateString } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import { generateAssignmentsFromPattern } from "@/lib/shift-patterns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!canEditShifts(user.role, user.canManageShifts)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");

  const where = isAdmin(user.role)
    ? departmentId ? { departmentId } : {}
    : { departmentId: user.departmentId };

  const patterns = await prisma.shiftPattern.findMany({
    where,
    include: {
      template: { select: { id: true, name: true, color: true, startTime: true, endTime: true, dayTimeRules: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: [{ startDate: "asc" }, { user: { name: "asc" } }],
  });

  return NextResponse.json(patterns);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!canEditShifts(user.role, user.canManageShifts)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, departmentId, templateId, userId, startDate, endDate, recurrenceType, intervalWeeks, weekdayRules, note } = await req.json();

  if (!name || !departmentId || !templateId || !userId || !startDate || !endDate || !weekdayRules) {
    return NextResponse.json({ error: "Manglende påkrævede felter" }, { status: 400 });
  }

  // Scope: manager kan kun oprette i egen afdeling
  if (!isAdmin(user.role) && departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validér at templateId tilhører den angivne afdeling
  // (forhindrer manager i at bruge en skabelon fra anden afdeling
  //  ved at gætte template-IDs)
  const template = await prisma.shiftTemplate.findUnique({
    where: { id: templateId },
    select: { departmentId: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Vagtskabelon ikke fundet" }, { status: 404 });
  }
  if (template.departmentId !== departmentId) {
    return NextResponse.json({ error: "Vagtskabelon tilhører ikke den angivne afdeling" }, { status: 403 });
  }

  // Validér at userId tilhører departmentId (gælder også admin for at undgå
  // inkonsistente patterns hvor en bruger fra dept B tildeles dept A's template)
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "Medarbejder ikke fundet" }, { status: 404 });
  }
  if (targetUser.departmentId !== departmentId) {
    return NextResponse.json({ error: "Medarbejder tilhører ikke den angivne afdeling" }, { status: 403 });
  }

  // Validér recurrenceType
  const safeRecurrenceType = isValidRecurrenceType(recurrenceType) ? recurrenceType : "weekly";

  // Validér intervalWeeks
  const safeIntervalWeeks = isValidIntervalWeeks(intervalWeeks) ? intervalWeeks : 1;

  // Validér datoer
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return NextResponse.json({ error: "Ugyldig dato" }, { status: 400 });
  }
  if (new Date(startDate) > new Date(endDate)) {
    return NextResponse.json({ error: "Startdato skal være før slutdato" }, { status: 400 });
  }

  const pattern = await prisma.shiftPattern.create({
    data: {
      name: name.trim(),
      departmentId,
      templateId,
      userId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      recurrenceType: safeRecurrenceType,
      intervalWeeks: safeIntervalWeeks,
      weekdayRules: typeof weekdayRules === "string" ? weekdayRules : JSON.stringify(weekdayRules),
      note: note ? String(note).slice(0, 500) : null,
      active: true,
    },
    include: {
      template: { select: { id: true, name: true, color: true, startTime: true, endTime: true } },
      user: { select: { id: true, name: true } },
    },
  });

  const generated = await generateAssignmentsFromPattern(pattern);

  return NextResponse.json({ ...pattern, generated }, { status: 201 });
}
