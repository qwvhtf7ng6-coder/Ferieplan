export type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type EntryType = "FULL_DAY" | "HALF_DAY_AM" | "HALF_DAY_PM";
export type VisibilitySetting = "ALL_EMPLOYEES" | "MANAGEMENT_ONLY";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
}

export interface EntryInput {
  date: string; // yyyy-MM-dd
  type: EntryType;
}

export interface CreateRequestInput {
  entries: EntryInput[];
  note?: string;
}

export interface UpdateRequestInput {
  status?: RequestStatus;
  note?: string;
}

export interface VacationEntryRow {
  id: string;
  date: Date;
  type: EntryType;
  days: number;
}

export interface VacationRequestRow {
  id: string;
  status: RequestStatus;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  departmentId: string;
  user: { id: string; name: string; email: string };
  department: { id: string; name: string; maxConcurrent: number };
  entries: VacationEntryRow[];
}

export interface DepartmentWithUsers {
  id: string;
  name: string;
  maxConcurrent: number;
  users: { id: string; name: string; departmentId: string | null }[];
}

export interface HolidayRow {
  id: string;
  name: string;
  date: Date;
  isNational: boolean;
}

export interface CapacityCheckResult {
  exceeded: boolean;
  date?: string;
  current?: number;
  max?: number;
}

export interface ActionResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
  capacityWarning?: string;
}
