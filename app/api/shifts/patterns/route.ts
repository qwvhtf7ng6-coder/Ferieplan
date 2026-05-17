import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManager, isAdmin } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { generateAssignmentsFromPattern } from "@/lib/shift-patterns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, departmentId, templateId, userId, startDate, endDate, recurrenceType, intervalWeeks, weekdayRules, note } = await req.json();

  if (!name || !departmentId || !templateId || !userId || !startDate || !endDate || !weekdayRules) {
    return NextResponse.json({ error: "Manglende påkrævede felter" }, { status: 400 });
  }
  if (!isAdmin(user.role) && departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pattern = await prisma.shiftPattern.create({
    data: {
      name: name.trim(), departmentId, templateId, userId,
      startDate: new Date(startDate), endDate: new Date(endDate),
      recurrenceType: recurrenceType || "weekly",
      intervalWeeks: intervalWeeks || 1,
      weekdayRules: typeof weekdayRules === "string" ? weekdayRules : JSON.stringify(weekdayRules),
      note: note || null, active: true,
    },
    include: {
      template: { select: { id: true, name: true, color: true, startTime: true, endTime: true } },
      user: { select: { id: true, name: true } },
    },
  });

  const generated = await generateAssignmentsFromPattern(pattern);

  return NextResponse.json({ ...pattern, generated }, { status: 201 });
}
