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

export async function isVacationBalanceEnabled(): Promise<boolean> {
  const settings = await prisma.appSettings.findFirst();
  return settings?.vacationBalanceEnabled ?? false;
}

/** Single source of truth for whether a user can see the shifts link.
 *  ADMINs always can. MANAGERs only if their department has shiftsEnabled.
 *  EMPLOYEEs can see shifts (read-only) if their department has shiftsEnabled.
 *  Users with canManageShifts can always see shifts. */
export async function canSeeShifts(role: UserRole, departmentId: string | null | undefined, canManageShifts?: boolean): Promise<boolean> {
  if (isAdmin(role)) return true;
  if (canManageShifts) return true;
  if (!departmentId) return false;
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { shiftsEnabled: true },
  });
  return dept?.shiftsEnabled ?? false;
}
