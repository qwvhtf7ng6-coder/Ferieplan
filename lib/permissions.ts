export type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";
export type VisibilitySetting = "ALL_EMPLOYEES" | "MANAGEMENT_ONLY";

export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN";
}

export function isManager(role: UserRole): boolean {
  return role === "MANAGER" || role === "ADMIN";
}

export function isEmployee(role: UserRole): boolean {
  return role === "EMPLOYEE";
}

export function canManageDepartment(
  userRole: UserRole,
  userDeptId: string | null | undefined,
  targetDeptId: string
): boolean {
  if (isAdmin(userRole)) return true;
  if (isManager(userRole) && userDeptId === targetDeptId) return true;
  return false;
}

export function canViewCalendar(
  userRole: UserRole,
  visibility: VisibilitySetting
): boolean {
  if (isManager(userRole)) return true;
  return visibility === "ALL_EMPLOYEES";
}

/** Vagtplan-redigering: ledere/admins + brugere med canManageShifts-tilladelse */
export function canEditShifts(role: UserRole, canManageShifts?: boolean): boolean {
  if (isManager(role)) return true;
  return canManageShifts === true;
}

export function canCancelOwnRequest(status: string): boolean {
  return status === "PENDING";
}

export function canEditRequest(
  userRole: UserRole,
  requestUserId: string,
  currentUserId: string,
  requestDeptId: string,
  userDeptId: string | null | undefined
): boolean {
  if (isAdmin(userRole)) return true;
  if (isManager(userRole) && requestDeptId === userDeptId) return true;
  return false;
}
