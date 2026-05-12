import { Role } from "@prisma/client";

export function isAdmin(role: Role) {
  return role === Role.ADMIN;
}

export function isManager(role: Role) {
  return role === Role.MANAGER || role === Role.ADMIN;
}

export function canManageDepartment(
  userRole: Role,
  userDeptId: string | null | undefined,
  targetDeptId: string
) {
  if (isAdmin(userRole)) return true;
  if (isManager(userRole) && userDeptId === targetDeptId) return true;
  return false;
}

export function canViewCalendar(
  userRole: Role,
  visibility: "ALL_EMPLOYEES" | "MANAGEMENT_ONLY"
) {
  if (isManager(userRole)) return true;
  return visibility === "ALL_EMPLOYEES";
}
