import { prisma } from "@/lib/prisma";
import { isManager } from "@/lib/permissions";
import type { UserRole } from "@/types";

export async function getCalendarVisibility(): Promise<"ALL_EMPLOYEES" | "MANAGEMENT_ONLY"> {
  const settings = await prisma.appSettings.findFirst();
  return settings?.calendarVisibility ?? "ALL_EMPLOYEES";
}

/** Single source of truth for whether a user can see the calendar link */
export async function canSeeCalendar(role: UserRole): Promise<boolean> {
  if (isManager(role)) return true;
  const visibility = await getCalendarVisibility();
  return visibility === "ALL_EMPLOYEES";
}
