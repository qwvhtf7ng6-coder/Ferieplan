import { prisma } from "@/lib/prisma";
import { isManager, isAdmin } from "@/lib/permissions";
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

/** Single source of truth for whether a user can see the shifts link.
 *  ADMINs always can. MANAGERs only if their department has shiftsEnabled.
 *  EMPLOYEEs never see the shifts nav link. */
export async function canSeeShifts(role: UserRole, departmentId: string | null | undefined): Promise<boolean> {
  if (isAdmin(role)) return true;
  if (!isManager(role)) return false;
  if (!departmentId) return false;
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { shiftsEnabled: true },
  });
  return dept?.shiftsEnabled ?? false;
}
