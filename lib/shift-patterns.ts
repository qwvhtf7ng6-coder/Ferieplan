import { prisma } from "@/lib/prisma";

export async function generateAssignmentsFromPattern(pattern: {
  organizationId: string;
  userId: string;
  templateId: string;
  startDate: Date;
  endDate: Date;
  recurrenceType: string;
  intervalWeeks: number;
  weekdayRules: string;
  note: string | null;
}): Promise<number> {
  let rules: unknown;
  try {
    rules = JSON.parse(pattern.weekdayRules);
  } catch {
    // Korrupt weekdayRules — generer ingen vagter frem for at crashe
    console.error(`[shift-patterns] Ugyldig weekdayRules JSON for pattern (userId=${pattern.userId})`);
    return 0;
  }

  const dates: Date[] = [];

  const start = new Date(pattern.startDate);
  const end = new Date(pattern.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (pattern.recurrenceType === "weekly") {
    const weekdays = rules as number[];
    if (!Array.isArray(weekdays)) return 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (weekdays.includes(cur.getDay())) dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

  } else if (pattern.recurrenceType === "nth_weekday") {
    const { weekday, every, firstOccurrence } =
      rules as { weekday: number; every: number; firstOccurrence: string };
    if (
      typeof weekday !== "number" ||
      typeof every !== "number" || every < 1 ||
      typeof firstOccurrence !== "string"
    ) return 0;

    const anchor = new Date(firstOccurrence + "T12:00:00");
    anchor.setHours(0, 0, 0, 0);
    const intervalMs = every * 7 * 24 * 60 * 60 * 1000;

    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() === weekday) {
        const diffMs = cur.getTime() - anchor.getTime();
        if (diffMs >= 0 && diffMs % intervalMs === 0) {
          dates.push(new Date(cur));
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

  } else if (pattern.recurrenceType === "interval") {
    const ruleArr = rules as { weekIndex: number; weekdays: number[] }[];
    if (!Array.isArray(ruleArr)) return 0;

    const cycleLength = Math.max(1, Math.min(8, pattern.intervalWeeks));
    const cycleAnchor = new Date(start);
    const dow = cycleAnchor.getDay();
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    cycleAnchor.setDate(cycleAnchor.getDate() - daysFromMon);
    cycleAnchor.setHours(0, 0, 0, 0);

    const cur = new Date(start);
    while (cur <= end) {
      const diffDays = Math.floor((cur.getTime() - cycleAnchor.getTime()) / 86400000);
      const weekIndex = Math.floor(diffDays / 7) % cycleLength;
      const rule = ruleArr.find((r) => r.weekIndex === weekIndex);
      if (rule && Array.isArray(rule.weekdays) && rule.weekdays.includes(cur.getDay())) {
        dates.push(new Date(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  for (const date of dates) {
    await prisma.shiftAssignment.upsert({
      where: { userId_date_templateId: { userId: pattern.userId, date, templateId: pattern.templateId } },
      update: { note: pattern.note || null },
      create: { organizationId: pattern.organizationId, userId: pattern.userId, templateId: pattern.templateId, date, note: pattern.note || null },
    });
  }

  return dates.length;
}
