/**
 * Tilladelsessystem — type-definitioner.
 *
 * To slags tilladelser:
 *  - Scope-tilladelser: tre-vejs valg (NONE | OWN_DEPARTMENT | ALL)
 *  - Boolean-tilladelser: simpel true/false
 *
 * Default-værdier pr. rolle ligger i lib/permission-defaults.ts.
 * Håndhævelse sker via can()-helperen i lib/can.ts.
 */

export type Scope = "NONE" | "OWN_DEPARTMENT" | "ALL";

/** Tilladelser med tre-vejs scope. */
export type ScopePermissionKey =
  | "application.create_on_behalf"
  | "application.view_others"
  | "application.cancel_others"
  | "approval.decide"
  | "calendar.view_extended"
  | "report.absence"
  | "report.department"
  | "shift.assign"
  | "balance.view_others"
  | "balance.edit"
  | "user.view"
  | "user.edit"
  | "user.reset_password";

/** Tilladelser med boolean-værdi. */
export type BoolPermissionKey =
  | "approval.override_capacity"
  | "calendar.print"
  | "report.export_csv"
  | "shift.edit_templates"
  | "shift.print"
  | "user.create"
  | "holidays.edit"
  | "departments.edit"
  | "settings.edit"
  | "permissions.edit";

export type PermissionKey = ScopePermissionKey | BoolPermissionKey;

/** Det fulde tilladelses-objekt der gemmes som JSON på User. */
export type Permissions = {
  [K in ScopePermissionKey]: Scope;
} & {
  [K in BoolPermissionKey]: boolean;
};

/** Alle scope-nøgler. Bruges til validering, UI-iteration og merge-logik. */
export const SCOPE_PERMISSION_KEYS: readonly ScopePermissionKey[] = [
  "application.create_on_behalf",
  "application.view_others",
  "application.cancel_others",
  "approval.decide",
  "calendar.view_extended",
  "report.absence",
  "report.department",
  "shift.assign",
  "balance.view_others",
  "balance.edit",
  "user.view",
  "user.edit",
  "user.reset_password",
] as const;

/** Alle boolean-nøgler. Bruges til validering, UI-iteration og merge-logik. */
export const BOOL_PERMISSION_KEYS: readonly BoolPermissionKey[] = [
  "approval.override_capacity",
  "calendar.print",
  "report.export_csv",
  "shift.edit_templates",
  "shift.print",
  "user.create",
  "holidays.edit",
  "departments.edit",
  "settings.edit",
  "permissions.edit",
] as const;

/** Alle tilladelses-nøgler samlet. */
export const PERMISSION_KEYS: readonly PermissionKey[] = [
  ...SCOPE_PERMISSION_KEYS,
  ...BOOL_PERMISSION_KEYS,
] as const;

/** Type-guard: er denne nøgle scope-baseret? */
export function isScopePermission(key: PermissionKey): key is ScopePermissionKey {
  return (SCOPE_PERMISSION_KEYS as readonly string[]).includes(key);
}

/** Type-guard: er denne nøgle boolean-baseret? */
export function isBoolPermission(key: PermissionKey): key is BoolPermissionKey {
  return (BOOL_PERMISSION_KEYS as readonly string[]).includes(key);
}

/** Validering af scope-værdi. */
export function isValidScope(value: unknown): value is Scope {
  return value === "NONE" || value === "OWN_DEPARTMENT" || value === "ALL";
}

/**
 * Saniterer rå JSON-input fra API til et velformet Permissions-input.
 *
 * Returnerer et sub-objekt med kun gyldige nøgler/værdier. Ukendte nøgler
 * forkastes lydløst. Ugyldige værdier udelades (så getEffectivePermissions
 * falder tilbage til rolle-defaults for den nøgle).
 *
 * Bruges af API-routen før vi gemmer på User.permissions, så vi ikke
 * skriver ondsindet eller misformet JSON ned i DB.
 */
export function sanitizePermissions(input: unknown): Partial<Permissions> {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const raw = input as Record<string, unknown>;
  const result: Record<string, Scope | boolean> = {};

  for (const key of SCOPE_PERMISSION_KEYS) {
    const value = raw[key];
    if (isValidScope(value)) {
      result[key] = value;
    }
  }
  for (const key of BOOL_PERMISSION_KEYS) {
    const value = raw[key];
    if (typeof value === "boolean") {
      result[key] = value;
    }
  }

  return result as Partial<Permissions>;
}
