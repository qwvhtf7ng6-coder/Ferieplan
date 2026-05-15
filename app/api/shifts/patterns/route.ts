import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManager, isAdmin } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

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

  const {
    name,
    departmentId,
    templateId,
    userId,
    startDate,
    endDate,
    recurrenceType,
    intervalWeeks,
    weekdayRules,
    note,
  } = await req.json();

  if (!name || !departmentId || !templateId || !userId || !startDate || !endDate || !weekdayRules) {
    return NextResponse.json({ error: "Manglende påkrævede felter" }, { status: 400 });
  }

  if (!isAdmin(user.role) && departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pattern = await prisma.shiftPattern.create({
    data: {
      name: name.trim(),
      departmentId,
      templateId,
      userId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      recurrenceType: recurrenceType || "weekly",
      intervalWeeks: intervalWeeks || 1,
      weekdayRules: typeof weekdayRules === "string" ? weekdayRules : JSON.stringify(weekdayRules),
      note: note || null,
      active: true,
    },
    include: {
      template: { select: { id: true, name: true, color: true, startTime: true, endTime: true } },
      user: { select: { id: true, name: true } },
    },
  });

  // Generate assignments from pattern
  await generateAssignmentsFromPattern(pattern);

  return NextResponse.json(pattern, { status: 201 });
}

// Helper: generate ShiftAssignment rows from a ShiftPattern
export async function generateAssignmentsFromPattern(pattern: {
  id: string;
  userId: string;
  templateId: string;
  startDate: Date;
  endDate: Date;
  recurrenceType: string;
  intervalWeeks: number;
  weekdayRules: string;
  note: string | null;
}) {
  const rules = JSON.parse(pattern.weekdayRules);
  const dates: Date[] = [];

  const start = new Date(pattern.startDate);
  const end = new Date(pattern.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (pattern.recurrenceType === "weekly") {
    // rules: number[] — weekday numbers (0=Sun,1=Mon...6=Sat)
    const weekdays: number[] = rules;
    const cur = new Date(start);
    while (cur <= end) {
      if (weekdays.includes(cur.getDay())) {
        dates.push(new Date(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
  } else if (pattern.recurrenceType === "interval") {
    // rules: { weekIndex: number, weekdays: number[] }[]
    // Cycle length = intervalWeeks
    const cycleLength = pattern.intervalWeeks;

    // Find the Monday of the week containing startDate
    const cycleAnchor = new Date(start);
    const dow = cycleAnchor.getDay(); // 0=Sun
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    cycleAnchor.setDate(cycleAnchor.getDate() - daysFromMon);
    cycleAnchor.setHours(0, 0, 0, 0);

    const cur = new Date(start);
    while (cur <= end) {
      // Which week in the cycle are we?
      const diffMs = cur.getTime() - cycleAnchor.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(diffDays / 7) % cycleLength;

      const rule = (rules as { weekIndex: number; weekdays: number[] }[]).find(
        (r) => r.weekIndex === weekIndex
      );
      if (rule && rule.weekdays.includes(cur.getDay())) {
        dates.push(new Date(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Bulk upsert assignments
  for (const date of dates) {
    await prisma.shiftAssignment.upsert({
      where: {
        userId_date_templateId: {
          userId: pattern.userId,
          date,
          templateId: pattern.templateId,
        },
      },
      update: { note: pattern.note || null },
      create: {
        userId: pattern.userId,
        templateId: pattern.templateId,
        date,
        note: pattern.note || null,
      },
    });
  }

  return dates.length;
}
