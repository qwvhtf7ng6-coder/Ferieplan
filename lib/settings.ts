import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import type { UserRole } from "@/types";

// Cache per org — nøgle inkluderer orgId
function getCachedSettings(orgId: string) {
  return unstable_cache(
    async () => {
      return await prisma.appSettings.findUnique({ where: { organizationId: orgId } });
    },
    [`app-settings-${orgId}`],
    { revalidate: 3600, tags: ["settings", `settings-${orgId}`] }
  )();
}

export async function getCalendarVisibility(orgId: string): Promise<"ALL_EMPLOYEES" | "MANAGEMENT_ONLY"> {
  const settings = await getCachedSettings(orgId);
  return settings?.calendarVisibility ?? "ALL_EMPLOYEES";
}

export async function isVacationBalanceEnabled(orgId: string): Promise<boolean> {
  const settings = await getCachedSettings(orgId);
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

export async function canSeeShifts(role: UserRole, departmentId: string | null | undefined, canManageShifts?: boolean): Promise<boolean> {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
  if (canManageShifts) return true;
  if (!departmentId) return false;
  return await getDepartmentShiftsEnabled(departmentId);
}
