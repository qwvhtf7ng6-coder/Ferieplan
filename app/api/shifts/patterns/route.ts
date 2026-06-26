import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject, scopeOf } from "@/lib/can";
import { isValidRecurrenceType, isValidIntervalWeeks, isValidDateString } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import { generateAssignmentsFromPattern } from "@/lib/shift-patterns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  const subject = buildSubject(user);
  if (!can(subject, "shift.assign")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");

  const assignScope = scopeOf(subject, "shift.assign");
  const deptFilter = assignScope === "ALL"
    ? departmentId ? { departmentId } : {}
    : { departmentId: user.departmentId };

  const patterns = await prisma.shiftPattern.findMany({
    where: { organizationId: orgId, ...deptFilter },
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
  const orgId = user.organizationId as string;
  const subject = buildSubject(user);
  if (!can(subject, "shift.assign")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, departmentId, templateId, userId, startDate, endDate, recurrenceType, intervalWeeks, weekdayRules, note } = await req.json();

  if (!name || !departmentId || !templateId || !userId || !startDate || !endDate || !weekdayRules) {
    return NextResponse.json({ error: "Manglende påkrævede felter" }, { status: 400 });
  }
  if (!can(subject, "shift.assign", { targetDepartmentId: departmentId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const template = await prisma.shiftTemplate.findFirst({ where: { id: templateId, organizationId: orgId }, select: { departmentId: true } });
  if (!template) return NextResponse.json({ error: "Vagtskabelon ikke fundet" }, { status: 404 });
  if (template.departmentId !== departmentId) {
    return NextResponse.json({ error: "Vagtskabelon tilhører ikke den angivne afdeling" }, { status: 403 });
  }

  const targetUser = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId }, select: { departmentId: true } });
  if (!targetUser) return NextResponse.json({ error: "Medarbejder ikke fundet" }, { status: 404 });
  if (targetUser.departmentId !== departmentId) {
    return NextResponse.json({ error: "Medarbejder tilhører ikke den angivne afdeling" }, { status: 403 });
  }

  const safeRecurrenceType = isValidRecurrenceType(recurrenceType) ? recurrenceType : "weekly";
  const safeIntervalWeeks = isValidIntervalWeeks(intervalWeeks) ? intervalWeeks : 1;

  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return NextResponse.json({ error: "Ugyldig dato" }, { status: 400 });
  }
  if (new Date(startDate) > new Date(endDate)) {
    return NextResponse.json({ error: "Startdato skal være før slutdato" }, { status: 400 });
  }

  const pattern = await prisma.shiftPattern.create({
    data: {
      organizationId: orgId,
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
