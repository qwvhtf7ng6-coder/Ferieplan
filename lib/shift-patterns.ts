import { prisma } from "@/lib/prisma";

export async function generateAssignmentsFromPattern(pattern: {
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
    const weekdays: number[] = rules;
    const cur = new Date(start);
    while (cur <= end) {
      if (weekdays.includes(cur.getDay())) dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
  } else if (pattern.recurrenceType === "interval") {
    const cycleLength = pattern.intervalWeeks;
    const cycleAnchor = new Date(start);
    const dow = cycleAnchor.getDay();
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    cycleAnchor.setDate(cycleAnchor.getDate() - daysFromMon);
    cycleAnchor.setHours(0, 0, 0, 0);

    const cur = new Date(start);
    while (cur <= end) {
      const diffDays = Math.floor((cur.getTime() - cycleAnchor.getTime()) / 86400000);
      const weekIndex = Math.floor(diffDays / 7) % cycleLength;
      const rule = (rules as { weekIndex: number; weekdays: number[] }[]).find(
        (r) => r.weekIndex === weekIndex
      );
      if (rule && rule.weekdays.includes(cur.getDay())) dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }

  for (const date of dates) {
    await prisma.shiftAssignment.upsert({
      where: { userId_date_templateId: { userId: pattern.userId, date, templateId: pattern.templateId } },
      update: { note: pattern.note || null },
      create: { userId: pattern.userId, templateId: pattern.templateId, date, note: pattern.note || null },
    });
  }

  return dates.length;
}
