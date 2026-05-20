import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import type { UserRole } from "@/types";

// Cache app settings for 1 hour — rarely changes
const getCachedSettings = unstable_cache(
  async () => {
    return await prisma.appSettings.findFirst();
  },
  ["app-settings"],
  { revalidate: 3600, tags: ["settings"] }
);

export async function getCalendarVisibility(): Promise<"ALL_EMPLOYEES" | "MANAGEMENT_ONLY"> {
  const settings = await getCachedSettings();
  return settings?.calendarVisibility ?? "ALL_EMPLOYEES";
}

export async function isVacationBalanceEnabled(): Promise<boolean> {
  const settings = await getCachedSettings();
  return settings?.vacationBalanceEnabled ?? false;
}

// Cache department shift visibility per department (1 hour)
const getDepartmentShiftsEnabled = unstable_cache(
  async (departmentId: string) => {
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { shiftsEnabled: true },
    });
    return dept?.shiftsEnabled ?? false;
  },
  ["dept-shifts"],
  { revalidate: 3600, tags: ["departments"] }
);

/** Single source of truth for whether a user can see the shifts link.
 *  ADMINs always can. MANAGERs only if their department has shiftsEnabled.
 *  EMPLOYEEs can see shifts (read-only) if their department has shiftsEnabled.
 *  Users with canManageShifts can always see shifts. */
export async function canSeeShifts(role: UserRole, departmentId: string | null | undefined, canManageShifts?: boolean): Promise<boolean> {
  if (role === "ADMIN") return true;
  if (canManageShifts) return true;
  if (!departmentId) return false;
  return await getDepartmentShiftsEnabled(departmentId);
}
