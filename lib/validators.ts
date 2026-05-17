// Fælles validators til brug på tværs af API routes

/** Validerer "HH:MM" format (00:00 – 23:59) */
export function isValidTime(t: unknown): t is string {
  if (typeof t !== "string") return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/** Validerer hex-farve (#rrggbb) */
export function isValidHexColor(c: unknown): c is string {
  if (typeof c !== "string") return false;
  return /^#[0-9a-fA-F]{6}$/.test(c);
}

/** Tilladt rolle-enum */
export const VALID_ROLES = ["EMPLOYEE", "MANAGER", "ADMIN"] as const;
export type ValidRole = typeof VALID_ROLES[number];

export function isValidRole(r: unknown): r is ValidRole {
  return VALID_ROLES.includes(r as ValidRole);
}

/** Tilladt recurrenceType-enum */
export const VALID_RECURRENCE_TYPES = ["weekly", "nth_weekday", "interval"] as const;
export type ValidRecurrenceType = typeof VALID_RECURRENCE_TYPES[number];

export function isValidRecurrenceType(r: unknown): r is ValidRecurrenceType {
  return VALID_RECURRENCE_TYPES.includes(r as ValidRecurrenceType);
}

/** Validerer intervalWeeks: skal være et heltal mellem 1 og 8 */
export function isValidIntervalWeeks(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 8;
}

/** Validerer ISO-datostreng (YYYY-MM-DD eller ISO 8601) */
export function isValidDateString(d: unknown): d is string {
  if (typeof d !== "string" || !d) return false;
  const ts = Date.parse(d);
  return !isNaN(ts);
}
