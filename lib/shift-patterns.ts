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
    // rules: number[] — ugedagsnumre (0=søn, 1=man ... 6=lør)
    const weekdays: number[] = rules;
    const cur = new Date(start);
    while (cur <= end) {
      if (weekdays.includes(cur.getDay())) dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

  } else if (pattern.recurrenceType === "nth_weekday") {
    // rules: { weekday: number, every: number, firstOccurrence: string }
    // firstOccurrence er det brugervalgte anker — cyklus 0 starter her.
    // Alle forekomster af ugedagen i perioden der falder på
    // firstOccurrence + N*7 dage (for heltal N >= 0) inkluderes.
    const { weekday, every, firstOccurrence } =
      rules as { weekday: number; every: number; firstOccurrence: string };

    // Anker: middagstid for at undgå sommertid-problemer
    const anchor = new Date(firstOccurrence + "T12:00:00");
    anchor.setHours(0, 0, 0, 0);

    const intervalMs = every * 7 * 24 * 60 * 60 * 1000;

    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() === weekday) {
        // Er denne dag et gyldigt trin fra ankeret?
        const diffMs = cur.getTime() - anchor.getTime();
        // diffMs skal være ikke-negativt og præcist deleligt med intervalMs
        if (diffMs >= 0 && diffMs % intervalMs === 0) {
          dates.push(new Date(cur));
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

  } else if (pattern.recurrenceType === "interval") {
    // rules: { weekIndex: number, weekdays: number[] }[]
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
