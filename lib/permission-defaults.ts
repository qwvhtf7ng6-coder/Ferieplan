/**
 * Default-tilladelser pr. rolle.
 *
 * Disse bruges når:
 *  - En bruger har permissions = null (admin har ikke ændret noget)
 *  - Admin trykker "Nulstil til rolle-defaults" på en bruger
 *  - En ny bruger oprettes
 *
 * ADMIN_DEFAULTS er en sikkerhedslås: ADMIN-rollen returnerer altid disse,
 * uanset hvad der er gemt i DB. Se getEffectivePermissions() i lib/can.ts.
 *
 * Ændringer her påvirker KUN nye brugere og brugere uden gemte overrides.
 * Eksisterende brugere med gemte permissions beholder deres setup indtil
 * admin eksplicit nulstiller dem.
 */

import type { UserRole } from "@/lib/permissions";
import type { Permissions } from "@/lib/permission-types";

export const EMPLOYEE_DEFAULTS: Permissions = {
  // Ansøgninger — alt restriktivt
  "application.create_on_behalf": "NONE",
  "application.view_others": "NONE",
  "application.cancel_others": "NONE",
  // Godkendelse
  "approval.decide": "NONE",
  "approval.override_capacity": false,
  // Kalender — må printe egen kalender
  "calendar.view_extended": "NONE",
  "calendar.print": true,
  // Rapporter
  "report.absence": "NONE",
  "report.department": "NONE",
  "report.export_csv": false,
  // Vagtplan
  "shift.assign": "NONE",
  "shift.edit_templates": false,
  "shift.print": false,
  // Fraværssaldo
  "balance.view_others": "NONE",
  "balance.edit": "NONE",
  // Brugere
  "user.view": "NONE",
  "user.edit": "NONE",
  "user.create": false,
  "user.reset_password": "NONE",
  // Systemindstillinger
  "holidays.edit": false,
  "departments.edit": false,
  "settings.edit": false,
  "permissions.edit": false,
};

export const MANAGER_DEFAULTS: Permissions = {
  // Ansøgninger — egen afdeling
  "application.create_on_behalf": "OWN_DEPARTMENT",
  "application.view_others": "OWN_DEPARTMENT",
  "application.cancel_others": "OWN_DEPARTMENT",
  // Godkendelse — egen afdeling, men kan IKKE trumfe kapacitetsadvarsel
  "approval.decide": "OWN_DEPARTMENT",
  "approval.override_capacity": false,
  // Kalender — standard adgang via systemindstilling + må printe
  "calendar.view_extended": "NONE",
  "calendar.print": true,
  // Rapporter — egen afdeling, må eksportere CSV
  "report.absence": "OWN_DEPARTMENT",
  "report.department": "OWN_DEPARTMENT",
  "report.export_csv": true,
  // Vagtplan — egen afdeling, må redigere skabeloner og printe
  "shift.assign": "OWN_DEPARTMENT",
  "shift.edit_templates": true,
  "shift.print": true,
  // Fraværssaldo — kan se egen afdeling, kan ikke redigere
  "balance.view_others": "OWN_DEPARTMENT",
  "balance.edit": "NONE",
  // Brugere — må se egen afdeling, men ikke redigere/oprette/nulstille
  "user.view": "OWN_DEPARTMENT",
  "user.edit": "NONE",
  "user.create": false,
  "user.reset_password": "NONE",
  // Systemindstillinger — låst
  "holidays.edit": false,
  "departments.edit": false,
  "settings.edit": false,
  "permissions.edit": false,
};

export const ADMIN_DEFAULTS: Permissions = {
  "application.create_on_behalf": "ALL",
  "application.view_others": "ALL",
  "application.cancel_others": "ALL",
  "approval.decide": "ALL",
  "approval.override_capacity": true,
  "calendar.view_extended": "ALL",
  "calendar.print": true,
  "report.absence": "ALL",
  "report.department": "ALL",
  "report.export_csv": true,
  "shift.assign": "ALL",
  "shift.edit_templates": true,
  "shift.print": true,
  "balance.view_others": "ALL",
  "balance.edit": "ALL",
  "user.view": "ALL",
  "user.edit": "ALL",
  "user.create": true,
  "user.reset_password": "ALL",
  "holidays.edit": true,
  "departments.edit": true,
  "settings.edit": true,
  "permissions.edit": true,
};

/** Returnerer default-tilladelses-objektet for en given rolle. */
export function defaultsForRole(role: UserRole): Permissions {
  switch (role) {
    case "ADMIN":
      return ADMIN_DEFAULTS;
    case "MANAGER":
      return MANAGER_DEFAULTS;
    case "EMPLOYEE":
    default:
      return EMPLOYEE_DEFAULTS;
  }
}
