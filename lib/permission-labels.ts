/**
 * UI-metadata til tilladelses-editoren.
 *
 * Definerer:
 *  - Grupper (8 stk) og rækkefølge
 *  - Hver tilladelses danske label + kort beskrivelse
 *  - Sortering inden for hver gruppe
 *
 * Holdt adskilt fra lib/permission-types.ts fordi sidstnævnte er pure
 * type-data der bruges både server- og klient-side; denne fil er ren
 * præsentation og importeres kun af editor-UI'en.
 */

import type { PermissionKey } from "@/lib/permission-types";

export interface PermissionGroup {
  id: string;
  label: string;
  description: string;
  keys: PermissionKey[];
}

/**
 * De 8 grupper. Rækkefølgen styrer accordion-rækkefølgen i editoren —
 * mest hyppige først, system-indstillinger sidst.
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "application",
    label: "Ansøgninger",
    description: "Se og opret ansøgninger på vegne af andre",
    keys: [
      "application.view_others",
      "application.create_on_behalf",
      "application.cancel_others",
    ],
  },
  {
    id: "approval",
    label: "Godkendelse",
    description: "Godkend og afvis ansøgninger",
    keys: [
      "approval.decide",
      "approval.override_capacity",
    ],
  },
  {
    id: "calendar",
    label: "Kalender",
    description: "Udvidet kalender-visning og print",
    keys: [
      "calendar.view_extended",
      "calendar.print",
    ],
  },
  {
    id: "report",
    label: "Rapporter",
    description: "Fraværsrapporter og eksport",
    keys: [
      "report.absence",
      "report.department",
      "report.export_csv",
    ],
  },
  {
    id: "shift",
    label: "Vagtplan",
    description: "Tildel vagter og rediger vagtskabeloner",
    keys: [
      "shift.assign",
      "shift.edit_templates",
      "shift.print",
    ],
  },
  {
    id: "balance",
    label: "Feriedagsregnskab",
    description: "Se og rediger andres feriedagsregnskab",
    keys: [
      "balance.view_others",
      "balance.edit",
    ],
  },
  {
    id: "user",
    label: "Brugere",
    description: "Administration af brugerkonti",
    keys: [
      "user.view",
      "user.edit",
      "user.create",
      "user.reset_password",
    ],
  },
  {
    id: "system",
    label: "Systemindstillinger",
    description: "Adgang til afdelinger, helligdage og systemfunktioner",
    keys: [
      "departments.edit",
      "holidays.edit",
      "settings.edit",
      "permissions.edit",
    ],
  },
];

/**
 * Dansk label + beskrivelse pr. enkelt tilladelse.
 * Bruges af editor-rækken til at vise hvad hver indstilling betyder.
 */
export const PERMISSION_LABELS: Record<PermissionKey, { label: string; description: string }> = {
  // Ansøgninger
  "application.view_others":     { label: "Se andres ansøgninger",        description: "Få adgang til ansøgningslisten med andre brugeres ansøgninger" },
  "application.create_on_behalf":{ label: "Opret på vegne af andre",      description: "Opret en ansøgning direkte som godkendt for en anden bruger" },
  "application.cancel_others":   { label: "Annullér andres ansøgninger",  description: "Træk en anden brugers godkendte ansøgning tilbage" },

  // Godkendelse
  "approval.decide":             { label: "Godkend og afvis",             description: "Træf afgørelse på ansøgninger fra andre brugere" },
  "approval.override_capacity":  { label: "Trumf kapacitetsadvarsel",     description: "Godkend selv når maksimalt antal samtidige fraværende er overskredet" },

  // Kalender
  "calendar.view_extended":      { label: "Udvidet kalendervisning",      description: "Se PENDING-ansøgninger og andres data uanset synlighedsindstilling" },
  "calendar.print":              { label: "Print kalender",               description: "Adgang til print-venlig kalendervisning" },

  // Rapporter
  "report.absence":              { label: "Fraværsrapport",               description: "Se fraværsoversigt for valgte brugere" },
  "report.department":           { label: "Afdelingsrapport",             description: "Se statistik aggregeret pr. afdeling" },
  "report.export_csv":           { label: "Eksportér til CSV",            description: "Download rapporter som CSV-fil" },

  // Vagtplan
  "shift.assign":                { label: "Tildel vagter",                description: "Opret og fjern vagttildelinger for medarbejdere" },
  "shift.edit_templates":        { label: "Rediger vagtskabeloner",       description: "Opret, ændr og slet vagttyper i afdelingen" },
  "shift.print":                 { label: "Print vagtplan",               description: "Adgang til print-venlig vagtplan" },

  // Feriedagsregnskab
  "balance.view_others":         { label: "Se andres saldo",              description: "Få adgang til feriedagsregnskab for andre brugere" },
  "balance.edit":                { label: "Rediger saldo",                description: "Justér tildelte dage og overførsler for brugere" },

  // Brugere
  "user.view":                   { label: "Se brugere",                   description: "Få adgang til brugerlisten" },
  "user.edit":                   { label: "Rediger brugere",              description: "Ændr navn, email, rolle og afdeling for brugere" },
  "user.create":                 { label: "Opret brugere",                description: "Tilføj nye brugere til systemet" },
  "user.reset_password":         { label: "Nulstil adgangskoder",         description: "Sæt en ny adgangskode for en anden bruger" },

  // System
  "departments.edit":            { label: "Administrér afdelinger",       description: "Opret, ændr og slet afdelinger" },
  "holidays.edit":               { label: "Administrér helligdage",       description: "Tilføj og fjern helligdage i kalenderen" },
  "settings.edit":               { label: "Systemindstillinger",          description: "Ændr globale indstillinger som kalender-synlighed og påmindelser" },
  "permissions.edit":            { label: "Redigér tilladelser",          description: "Tilpas individuelle tilladelser for andre brugere" },
};

/**
 * Danske labels til scope-værdier.
 */
export const SCOPE_LABELS = {
  NONE:            "Ingen",
  OWN_DEPARTMENT:  "Egen afd.",
  ALL:             "Alle",
} as const;
