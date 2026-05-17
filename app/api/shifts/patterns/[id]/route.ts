import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManager, isAdmin } from "@/lib/permissions";
import { isValidRecurrenceType, isValidIntervalWeeks, isValidDateString } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import { generateAssignmentsFromPattern } from "@/lib/shift-patterns";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.shiftPattern.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  if (!isAdmin(user.role) && existing.departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { active, name, note, startDate, endDate, recurrenceType, intervalWeeks, weekdayRules } = await req.json();

  // Validér datoer hvis de er med
  if (startDate !== undefined && !isValidDateString(startDate)) {
    return NextResponse.json({ error: "Ugyldig startdato" }, { status: 400 });
  }
  if (endDate !== undefined && !isValidDateString(endDate)) {
    return NextResponse.json({ error: "Ugyldig slutdato" }, { status: 400 });
  }
  const resolvedStart = startDate ? new Date(startDate) : existing.startDate;
  const resolvedEnd = endDate ? new Date(endDate) : existing.endDate;
  if (resolvedStart > resolvedEnd) {
    return NextResponse.json({ error: "Startdato skal være før slutdato" }, { status: 400 });
  }

  const updated = await prisma.shiftPattern.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: String(name).trim().slice(0, 200) } : {}),
      ...(note !== undefined ? { note: note ? String(note).slice(0, 500) : null } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
      ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
      ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
      ...(recurrenceType !== undefined ? { recurrenceType: isValidRecurrenceType(recurrenceType) ? recurrenceType : existing.recurrenceType } : {}),
      ...(intervalWeeks !== undefined ? { intervalWeeks: isValidIntervalWeeks(intervalWeeks) ? intervalWeeks : existing.intervalWeeks } : {}),
      ...(weekdayRules !== undefined ? { weekdayRules: typeof weekdayRules === "string" ? weekdayRules : JSON.stringify(weekdayRules) } : {}),
    },
    include: {
      template: { select: { id: true, name: true, color: true, startTime: true, endTime: true } },
      user: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.shiftPattern.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  if (!isAdmin(user.role) && existing.departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.shiftPattern.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// POST /api/shifts/patterns/[id] => regenerer vagter
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const pattern = await prisma.shiftPattern.findUnique({ where: { id } });
  if (!pattern) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  // Scope: manager kan kun regenerere mønstre fra egen afdeling
  if (!isAdmin(user.role) && pattern.departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await generateAssignmentsFromPattern(pattern);
  return NextResponse.json({ ok: true, generated: count });
}
