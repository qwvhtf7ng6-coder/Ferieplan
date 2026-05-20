/**
 * Central tilladelses-håndhævelse.
 *
 * Brug `can()` overalt hvor adgang skal tjekkes — både server-side (API-routes,
 * server actions) og client-side (vis/skjul knapper i UI).
 *
 * For scope-tilladelser med en målafdeling, send context med targetDepartmentId.
 * For boolean-tilladelser og scope-tilladelser uden specifik kontekst, kald uden context.
 *
 * Eksempler:
 *   can(user, "settings.edit")
 *   can(user, "approval.decide", { targetDepartmentId: req.departmentId })
 *   can(user, "user.view") // "har brugeren overhovedet adgang til at se brugere?"
 */

import type { UserRole } from "@/lib/permissions";
import type {
  PermissionKey,
  Permissions,
  Scope,
  ScopePermissionKey,
} from "@/lib/permission-types";
import {
  defaultsForRole,
  ADMIN_DEFAULTS,
} from "@/lib/permission-defaults";
import {
  PERMISSION_KEYS,
  isScopePermission,
  isValidScope,
} from "@/lib/permission-types";

/**
 * Beregner de effektive tilladelser for en bruger.
 *
 * ADMIN returnerer ALTID fuld adgang uanset hvad der er gemt i DB — det er en
 * hard-coded sikkerhedslås så admin ikke kan låses ude.
 *
 * For andre roller: hvis brugeren har gemte overrides, bruges de (merged over
 * rolle-defaults for at fylde manglende nøgler ud). Ellers bruges rolle-defaults.
 *
 * Legacy: hvis legacyOverrides.canManageShifts er true (det gamle boolean-felt
 * på User), tilføjes shift.edit_templates: true og shift.assign: OWN_DEPARTMENT
 * automatisk. Det bevarer bagudkompatibilitet med eksisterende brugere der har
 * fået dette flag sat før tilladelsessystemet eksisterede.
 */
export function getEffectivePermissions(
  role: UserRole,
  storedPermissions: unknown,
  legacyOverrides?: { canManageShifts?: boolean | null }
): Permissions {
  // ADMIN: altid fuld adgang. Ingen DB-værdi kan reducere dette.
  if (role === "ADMIN") return ADMIN_DEFAULTS;

  const defaults = defaultsForRole(role);

  // Start fra defaults
  let merged: Record<string, unknown> = { ...defaults };

  // Læg gemte overrides oveni (kun gyldige værdier).
  if (
    storedPermissions != null &&
    typeof storedPermissions === "object" &&
    !Array.isArray(storedPermissions)
  ) {
    const stored = storedPermissions as Record<string, unknown>;
    for (const key of PERMISSION_KEYS) {
      const value = stored[key];
      if (value === undefined) continue;

      if (isScopePermission(key)) {
        if (isValidScope(value)) merged[key] = value;
      } else {
        if (typeof value === "boolean") merged[key] = value;
      }
    }
  }

  // Legacy canManageShifts: kan kun udvide adgang, aldrig indskrænke.
  if (legacyOverrides?.canManageShifts === true) {
    if (merged["shift.edit_templates"] === false) {
      merged["shift.edit_templates"] = true;
    }
    if (merged["shift.assign"] === "NONE") {
      merged["shift.assign"] = "OWN_DEPARTMENT";
    }
  }

  return merged as Permissions;
}

/**
 * Context der bruges til scope-baserede checks.
 *
 * - targetDepartmentId: id'et for den afdeling handlingen vedrører (f.eks. den
 *   afdeling en ansøgning tilhører, eller den bruger der skal redigeres' afdeling).
 *   Hvis `undefined`, returnerer OWN_DEPARTMENT-scope true så længe brugeren har
 *   en afdeling (= "har brugeren overhovedet noget scope?").
 */
export interface PermissionContext {
  targetDepartmentId?: string | null;
}

/**
 * Subject = brugeren der udfører handlingen.
 *
 * Kan bygges direkte fra en session via buildSubject(), eller konstrueres manuelt
 * når man tester eller udfører noget på vegne af en system-bruger.
 */
export interface PermissionSubject {
  role: UserRole;
  departmentId: string | null;
  permissions: Permissions;
}

/**
 * Bygger et PermissionSubject fra en bruger-objekt (typisk session.user).
 *
 * Tager rå `permissions`-feltet (JSON eller null) og beregner effektive
 * tilladelser inkl. ADMIN-override og legacy canManageShifts-flag.
 */
export function buildSubject(user: {
  role: UserRole;
  departmentId?: string | null;
  permissions?: unknown;
  canManageShifts?: boolean | null;
}): PermissionSubject {
  return {
    role: user.role,
    departmentId: user.departmentId ?? null,
    permissions: getEffectivePermissions(user.role, user.permissions, {
      canManageShifts: user.canManageShifts ?? null,
    }),
  };
}

/**
 * Tjekker om subject har en given tilladelse.
 *
 * Boolean-tilladelser: returnerer værdien direkte.
 *
 * Scope-tilladelser:
 *   - NONE → false
 *   - ALL  → true
 *   - OWN_DEPARTMENT:
 *       - hvis targetDepartmentId givet: true kun hvis det matcher subject.departmentId
 *       - hvis targetDepartmentId IKKE givet: true hvis subject har en afdeling
 *         (= "brugeren har noget scope, vi tjekker bare ikke mod et specifikt mål")
 */
export function can(
  subject: PermissionSubject | null | undefined,
  key: PermissionKey,
  context?: PermissionContext
): boolean {
  if (!subject) return false;

  const value = subject.permissions[key];

  // Boolean-tilladelse
  if (typeof value === "boolean") {
    return value;
  }

  // Scope-tilladelse
  const scope = value as Scope;

  if (scope === "NONE") return false;
  if (scope === "ALL") return true;

  // OWN_DEPARTMENT
  if (scope === "OWN_DEPARTMENT") {
    if (subject.departmentId == null) return false;
    const target = context?.targetDepartmentId;
    if (target === undefined) {
      // Ingen specifik target — returnér true fordi brugeren har "noget" scope.
      return true;
    }
    if (target === null) return false;
    return subject.departmentId === target;
  }

  return false;
}

/**
 * Returnerer den rå scope-værdi for en scope-tilladelse.
 *
 * Bruges når en query skal filtreres baseret på scope — f.eks. "hent
 * ansøgninger jeg må se" hvor WHERE-klausulen afhænger af om scope er
 * OWN_DEPARTMENT eller ALL.
 */
export function scopeOf(
  subject: PermissionSubject | null | undefined,
  key: ScopePermissionKey
): Scope {
  if (!subject) return "NONE";
  return subject.permissions[key];
}
