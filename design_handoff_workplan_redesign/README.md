# Handoff: WorkPlan / Ferieplan Redesign

> Target repo: **qwvhtf7ng6-coder/Ferieplan** (Next.js 14 App Router + TypeScript + Tailwind + Prisma + NextAuth)

## Overview

This package is a **full visual redesign** of the existing Ferieplan app. Every existing route, role, server action, API endpoint, database model, and permission rule must continue to work exactly as it does today. Only the UI changes.

The redesign covers every screen the codebase ships today:

- Login (`app/login/page.tsx`)
- Mine ansøgninger / Dashboard (`app/dashboard/page.tsx`)
- Ny ansøgning (`app/requests/new/page.tsx` + `components/RequestForm.tsx`)
- Manager: Ansøgninger (`app/manager/requests/page.tsx` + `ManagerRequestsClient.tsx` + `components/manager/*`)
- Manager: Opret på vegne af (`app/manager/requests/new/OnBehalfForm.tsx`)
- Manager: Vagtplan (`app/manager/shifts/ShiftsClient.tsx`)
- Manager: Kalender (`app/manager/calendar/page.tsx` + `components/CalendarGrid.tsx`)
- Admin: Brugere (`app/admin/users/AdminUsersClient.tsx`)
- Admin: Afdelinger (`app/admin/departments/DepartmentsClient.tsx`)
- Admin: Helligdage (`app/admin/holidays/HolidaysClient.tsx`)
- Admin: Rapporter (`app/admin/reports/ReportsClient.tsx`)
- Admin: Indstillinger (`app/admin/settings/SettingsClient.tsx`)
- Min profil (profile page)
- Sidebar nav (`components/Nav.tsx`) + Notification bell (`components/notifications/NotificationBell.tsx`)

---

## About the Design Files

The HTML/JSX files bundled here are **design references** — prototypes showing the intended look and behavior, **not production code to ship**.

**Do NOT:**
- Drop `WorkPlan Redesign.html` into the project
- Import the inline-React components from the HTML directly
- Replace Tailwind with the prototype's inline `style={{…}}` objects
- Touch any logic in `actions/`, `app/api/`, `lib/`, `prisma/`, `auth.ts`, `middleware.ts`, `types/`

**Do:**
- Recreate each design pixel-perfectly using the project's existing stack: **Tailwind CSS, TypeScript, Next.js App Router, server components + `"use client"` islands**
- Keep every existing prop signature, server-action call, route, and Prisma query intact
- Add the new design tokens to `tailwind.config.ts` and `app/globals.css` (see Design Tokens below)
- Migrate page by page; each PR should touch only the visual layer

---

## Fidelity

**High-fidelity (hifi).** The prototype is pixel-perfect — final colors, typography, spacing, radii, shadows, hover states, and dark mode are all defined. Match it exactly.

---

## Migration Strategy (recommended order)

Each step is independently shippable. Don't bundle them.

1. **Design tokens** — add CSS variables + Tailwind theme extension. Nothing visually changes yet.
2. **Primitives** — build `<Btn>`, `<Card>`, `<StatusBadge>`, `<Avatar>`, `<FieldInput>`, `<SectionLabel>`, `<PageHeader>`, `<SlideOver>` as Tailwind components in `components/ui/`. Replace existing `ui/Alert.tsx`, `ui/Badge.tsx`, `ui/Modal.tsx`, `ui/Spinner.tsx` only after the new ones are in place.
3. **Sidebar + TopBar** — rebuild `components/Nav.tsx` against the new design. Keep all role filtering + `calendarVisible` logic. The notification bell stays where the codebase puts it (top bar OR sidebar — the design supports both via the `NotificationBell` variant prop).
4. **Login** — visual only; keep the NextAuth `signIn` call.
5. **Dashboard, Ny ansøgning, Profile, Helligdage** — easy wins, low surface area.
6. **Manager: Ansøgninger** — biggest non-shifts change. Today widget, filters, click-row-to-open detail SlideOver with audit log, reject-with-reason, edit-note, capacity warning.
7. **Manager: Opret på vegne af** — visual only.
8. **Admin: Brugere, Afdelinger** — slide-over edit panels. Departments gets a new `shiftsEnabled` toggle (see DB note below).
9. **Admin: Rapporter** — 4 tabs (Fraværsrapport / Afdelingsrapport / Fraværsmønstre / CSV-eksport). Reuse existing CSV-export helpers verbatim.
10. **Admin: Indstillinger** — already aligned with `Settings.calendarVisibility` + `Settings.reminderThresholdDays`.
11. **Manager: Kalender** — restyle `components/CalendarGrid.tsx`. Hide shift-dots for departments where `shiftsEnabled === false`.
12. **Manager: Vagtplan** — restyle `ShiftsClient.tsx`. Filter the dept-picker to `shiftsEnabled === true`. The conflict ⚠️ badge is now permanent on the assignment card (today it only renders on the create response).

---

## Design Tokens

### Colors (CSS variables — light mode)

Add to `app/globals.css` inside the `:root` block:

```css
:root {
  /* Brand */
  --c-primary:        #4f46e5;
  --c-primary-hover:  #4338ca;
  --c-primary-light:  #eef2ff;
  --c-primary-muted:  rgba(79,70,229,.1);
  --c-accent:         #7c3aed;

  /* Status */
  --c-success: #059669;  --c-success-bg: #d1fae5;  --c-success-text: #065f46;
  --c-warning: #d97706;  --c-warning-bg: #fef3c7;  --c-warning-text: #92400e;
  --c-danger:  #dc2626;  --c-danger-bg:  #fee2e2;  --c-danger-text:  #991b1b;

  /* Surfaces */
  --c-bg:           #f0f3fb;
  --c-topbar-bg:    rgba(240,243,251,.92);
  --c-surface:      #ffffff;
  --c-border:       #e2e8f0;
  --c-border-hover: #bfcce0;

  /* Text */
  --c-text:        #111827;
  --c-text-muted:  #6b7280;
  --c-text-subtle: #9ca3af;

  /* Chrome */
  --c-sidebar: #0d1117;

  /* Type */
  --font: 'Plus Jakarta Sans', system-ui, sans-serif;

  /* Shadows */
  --sh-xs: 0 1px 2px rgba(0,0,0,0.05);
  --sh-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --sh-md: 0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05);
  --sh-lg: 0 12px 28px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06);

  /* Radii */
  --r-sm: 6px; --r-md: 10px; --r-lg: 14px; --r-xl: 20px; --r-full: 999px;
}

html.dark {
  --c-primary-light: rgba(79,70,229,.18);
  --c-primary-muted: rgba(79,70,229,.15);
  --c-success-bg:    rgba(5,150,105,.2);   --c-success-text: #34d399;
  --c-warning-bg:    rgba(217,119,6,.2);   --c-warning-text: #fbbf24;
  --c-danger-bg:     rgba(220,38,38,.2);   --c-danger-text:  #f87171;
  --c-bg:            #0b0f1a;
  --c-topbar-bg:     rgba(11,15,26,.92);
  --c-surface:       #141929;
  --c-border:        #1e2d45;
  --c-border-hover:  #2d4265;
  --c-text:          #f0f4ff;
  --c-text-muted:    #8899b5;
  --c-text-subtle:   #4b6080;
  --sh-xs: 0 1px 2px rgba(0,0,0,.3);
  --sh-sm: 0 1px 3px rgba(0,0,0,.4);
  --sh-md: 0 4px 12px rgba(0,0,0,.4);
  --sh-lg: 0 12px 28px rgba(0,0,0,.5);
}

body {
  font-family: var(--font);
  background: var(--c-bg);
  color: var(--c-text);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
```

Add Plus Jakarta Sans to `app/layout.tsx`:

```tsx
import { Plus_Jakarta_Sans } from 'next/font/google';
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400','500','600','700','800'] });
// then className={jakarta.className} on <body>
```

### Tailwind config

In `tailwind.config.ts` extend the theme so utility classes resolve the CSS variables:

```ts
theme: {
  extend: {
    colors: {
      primary:        'var(--c-primary)',
      'primary-hover':'var(--c-primary-hover)',
      'primary-light':'var(--c-primary-light)',
      'primary-muted':'var(--c-primary-muted)',
      accent:         'var(--c-accent)',
      surface:        'var(--c-surface)',
      bg:             'var(--c-bg)',
      border:         { DEFAULT: 'var(--c-border)', hover: 'var(--c-border-hover)' },
      text:           {
        DEFAULT: 'var(--c-text)',
        muted:   'var(--c-text-muted)',
        subtle:  'var(--c-text-subtle)',
      },
      success: 'var(--c-success)', 'success-bg': 'var(--c-success-bg)', 'success-text': 'var(--c-success-text)',
      warning: 'var(--c-warning)', 'warning-bg': 'var(--c-warning-bg)', 'warning-text': 'var(--c-warning-text)',
      danger:  'var(--c-danger)',  'danger-bg':  'var(--c-danger-bg)',  'danger-text':  'var(--c-danger-text)',
    },
    borderRadius: { sm:'6px', DEFAULT:'10px', md:'10px', lg:'14px', xl:'20px', full:'999px' },
    boxShadow: {
      xs:'0 1px 2px rgba(0,0,0,0.05)',
      sm:'0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      md:'0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
      lg:'0 12px 28px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06)',
    },
  },
},
darkMode: 'class',
```

Then enable dark mode by toggling `<html class="dark">`. Recommend persisting in `localStorage` and a small client-side script in `<head>` to avoid FOUC.

### Typography

| Use | Size | Weight | Tracking |
|---|---|---|---|
| Page title (`h1`) | 22px | 800 | -0.025em |
| Section heading | 17px | 800 | -0.02em |
| Card heading | 15px | 700 | normal |
| Body | 14px | 400 | normal |
| Body emphasis | 13.5px | 600 | normal |
| Meta / muted | 12px | 500–600 | normal |
| Section label (uppercase) | 11px | 700 | 0.08em |
| Stat numbers | 28–32px | 800 | -0.03em |

### Spacing

Use Tailwind's default scale. Card paddings are typically `p-5` (20px) to `p-6` (24px). Page padding is `px-9 py-8` (36/32). Max content width `860px` for forms/lists, `1100px` for reports, `1280px` for vagtplan grid.

### Iconography

The prototype uses a single inline-SVG icon set (`workplan-ui.jsx` → `IP` object). **Replace with `lucide-react`** in the real app — it's already a common Tailwind/Next pairing and is more maintainable.

Mapping:

| Prototype `name` | lucide-react |
|---|---|
| `home` | `Home` |
| `plus` | `Plus` |
| `list` | `ClipboardList` |
| `calendar` | `Calendar` |
| `clock` | `Clock` |
| `users` | `Users` |
| `building` | `Building2` |
| `flag` | `Flag` |
| `chart` | `BarChart3` |
| `settings` | `Settings` |
| `user` | `User` |
| `logout` | `LogOut` |
| `bell` | `Bell` |
| `check` | `Check` |
| `x` | `X` |
| `alert` | `AlertTriangle` |
| `search` | `Search` |
| `edit` | `Pencil` |
| `trash` | `Trash2` |
| `key` | `Key` |
| `shield` | `Shield` |
| `eye` | `Eye` |
| `download` | `Download` |
| `printer` | `Printer` |
| `briefcase` | `Briefcase` |
| `sun` | `Sun` |
| `moon` | `Moon` |
| `chevL` | `ChevronLeft` |
| `chevR` | `ChevronRight` |
| `grid` | `LayoutGrid` |
| `history` | `History` |
| `filter` | `SlidersHorizontal` |
| `send` | `Send` |

Use icons at `size={14}` for buttons, `size={16–20}` for headers and feature blocks.

---

## Components (`components/ui/`)

Build these once, use everywhere. The exact behavior is in `workplan-ui.jsx` lines 56–180.

### `Btn`

Props: `variant: "primary"|"secondary"|"success"|"danger"|"ghost"|"outline"`, `size: "sm"|"md"|"lg"`, `icon?`, `full?`, `disabled?`. Heights: sm 30px, md 38px, lg 46px. Border-radius `--r-md` (10px). Icon-only buttons square.

Tailwind sketch (primary, md):
```
inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold
bg-primary text-white shadow-[0_1px_4px_rgba(36,84,255,.3)]
hover:bg-primary-hover transition-colors
disabled:opacity-50 disabled:cursor-not-allowed
```

### `Card`

```
bg-surface border border-border rounded-lg shadow-xs
hover:border-border-hover hover:shadow-md transition-[box-shadow,border-color]
```

Pass `interactive` prop to opt-in to hover. Default padding is set by caller.

### `StatusBadge`

| status | bg | text |
|---|---|---|
| PENDING | `--c-warning-bg` | `--c-warning-text` |
| APPROVED | `--c-success-bg` | `--c-success-text` |
| REJECTED | `--c-danger-bg` | `--c-danger-text` |
| CANCELLED | `--c-bg` | `--c-text-subtle` |

Pill: `px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide whitespace-nowrap`.

### `Avatar`

Circle, gradient `linear-gradient(135deg,#4f46e5,#7c3aed)`. Shows first character of name uppercase, weight 700, ~38% of size as font-size.

### `FieldInput`

`px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-surface text-sm`. On focus: `border-primary` + `ring-[3px] ring-primary/12`. Label above, 13px / 600.

### `SlideOver`

Right-side drawer, 500px wide (520 for request detail). Backdrop `bg-black/45 backdrop-blur-[3px]`. Translate `translate-x-0` open, `translate-x-full` closed. Header sticky with title + subtitle + close. Body scrolls.

ESC key closes. Already works with Next App Router via portal — keep it client-side.

### `PageHeader`

Two-row layout: H1 (22/800/-0.025em) + sub (13/muted), and an actions slot on the right.

### `SectionLabel`

```
text-[11px] font-bold uppercase tracking-[0.08em] text-text-subtle mb-3
```

---

## Screen-by-screen mapping

For each screen, the source line in `WorkPlan Redesign.html` is given so the developer can copy markup intent directly.

### 1. Login — `app/login/page.tsx`

**Design source:** `WorkPlan Redesign.html` line 127 (`function LoginScreen`).

**Layout:** Two-column. Left 420px panel: dark `#0d1117` background with logo, headline "Planlæg ferier. Effektivt.", three feature rows. Right column: email + password form, Btn primary submit, demo creds chip below.

**Keep:** All NextAuth `signIn(...)` logic from the existing page, the error handling, redirect to `/dashboard`.

### 2. Dashboard — `app/dashboard/page.tsx`

**Design source:** line 165 (`DashboardScreen`).

**Layout:** PageHeader + 4 stat cards (I alt / Afventer / Godkendt / Godkendte dage). Stat card = 32/800 number colored, 12/600 muted label, 38×38 icon block tinted.

Below: section heading "Alle ansøgninger" + count, then a Card with a list. Each row: 8px status dot · date range · note (italic muted) · meta line · `StatusBadge` · Cancel (red text, only if PENDING) · Detalje button (primary-light bg).

**Keep:** All Prisma queries, `formatDate`, `totalDaysFromEntries`, `RequestCard` / `RequestList` data flow. Just restyle.

### 3. Ny ansøgning — `app/requests/new/page.tsx` + `components/RequestForm.tsx`

**Design source:** line 218 (`NewRequestScreen`).

**Layout:** PageHeader (with Annuller secondary button) → three Cards stacked:

1. **Datointerval** Card: Fra / Til date inputs (grid 2-col) + "Weekender springes automatisk over" hint + "Tilføj hverdage" sm button right
2. **Datolinjer** Card: dynamic list of rows. Each row = bg-bg, p-3, gap-2, abs-type colored dot, date input, type select, absence-type select, remove X button
3. **Note (valgfri)** Card: 3-row textarea, char counter bottom-right

Bottom action row right-aligned: Annuller secondary + "Indsend ansøgning" primary (icon=check, disabled when entries empty).

**Success state:** Centered 64×64 success circle + "Ansøgning indsendt!" + back button.

**Absence type select options must match the Prisma `AbsenceType` enum** — `VACATION` (Ferie), `VACATION_FREE` (Feriefri), `MATERNITY` (Barsel), `CHILD_SICK_DAY` (Barns 1. sygedag), `SICK` (Sygdom). Use the existing `ABSENCE_TYPE_LABELS` / `ABSENCE_TYPE_COLORS` from `lib/utils.ts` — do not redefine.

### 4. Manager: Ansøgninger — `app/manager/requests/page.tsx`

**Design source:** line 663 (`ManagerRequestsScreen`) + line 526 (`TodayWidget`) + line 553 (`RequestDetailPanel`).

This is the most complex screen. Build it in three parts:

#### 4a. Today widget

Card, p-4. Header row: "I dag — <day>" left, "X til stede" green + "X fraværende" amber pills right. Body row: chip per absent person → "Maria Hansen · Ferie". Hide chips row when 0 absent.

**Data sources to keep:** the existing `todayAbsences` Prisma query in `page.tsx` lines 41–55 and the `presentCount` / `absentCount` derivation — unchanged.

#### 4b. Filter bar

Segmented control for status (Afventer / Godkendt / Afvist / Alle), Pending tab shows a red count badge. Plus two selects: month + department. Right side: result count.

**Keep:** Existing `RequestFilters.tsx` query-param logic — just restyle the controls. The "Opret på vegne af" button moves to the PageHeader actions slot.

#### 4c. Request list + Detail SlideOver

List: cards p-4, hover state. Avatar + name + dept + StatusBadge top row; date range + days; note. PENDING rows get inline Godkend/Afvis buttons (use `e.stopPropagation()` so card click doesn't open the panel).

Clicking a row opens the **Request Detail SlideOver** (width 520):

- Avatar 48 + name + dept + StatusBadge
- 2-col summary grid in bg-bg card: Periode, Dage, Oprettet, Type, Note (with inline "Rediger" link)
- Rejection-reason callout (`bg-danger-bg`) only when status===REJECTED
- Datolinjer list (scrollable, max-h-50)
- Actions: Godkend/Afvis 2-col grid (PENDING only), then full-width "Annuller ansøgning" secondary (PENDING|APPROVED)
- **Historik (audit log)** — vertical timeline. Each entry: 26×26 colored icon circle + connector line + detail + "by · time" muted

**Audit log data:** call existing `getRequestWithAudit(requestId)` server action. Map each `auditLog.action` to `{icon, color}`:

| action | icon | color |
|---|---|---|
| created | plus | --c-primary |
| approved | check | #10b981 |
| rejected | x | #ef4444 |
| reminder | alert | #f59e0b |
| cancelled | x | #94a3b8 |
| note_edited | edit | --c-primary |

**Dialogs that nest inside the SlideOver (z-60):**

- **RejectDialog** — modal asking for reason (textarea, max 300 chars). Disable submit until non-empty. Call existing `rejectRequest(id, reason)`.
- **CapacityWarningDialog** — modal with amber warning circle, dept-cap message, "Genovervej" / "Godkend alligevel" buttons. The server `approveRequest` already returns `capacityWarning`; pop this modal when it does, and call a confirmed approve on accept.
- **EditNoteDialog** — modal with textarea (max 500). Call existing `editRequestNote(id, note)`.

### 5. Manager: Opret på vegne af — `app/manager/requests/new/page.tsx`

**Design source:** line 808 (`OnBehalfScreen`).

PageHeader (Annuller right) → four Cards:

1. **Medarbejder** — select of all active users with `name — dept` option text. Helper line below.
2. **Udfyld fra datointerval** — primary-light background card. Fra/Til + absence-type select + "Udfyld" button. On click, fills the entries list with weekdays only.
3. **Datolinjer** — same row layout as Ny ansøgning, plus "+ Tilføj dag" link top-right
4. **Note** — textarea, 2 rows

Submit: "Opret og godkend" primary, success state same pattern as Ny ansøgning.

**Keep:** Existing `createRequestOnBehalf` server action, `eachDayOfInterval`/`isWeekend` from date-fns.

### 6. Manager: Vagtplan — `app/manager/shifts/ShiftsClient.tsx`

**Design source:** line 989 (`ShiftsScreen`).

PageHeader with **dept select (filtered to `shiftsEnabled` only)** + "Udskriv" secondary in actions slot.

Two tabs: **Ugeplan** and **Vagttyper**.

#### Ugeplan
Week nav row: Forrige / week label / Næste / "I dag" outline button / template legend chips right-aligned.

Card grid: `gridTemplateColumns: 190px repeat(7,1fr)`.
- Header row (gridTemplateColumns same): "Medarbejder" label + 7 day columns (uppercase day name + 15/800 day number; today's column gets `bg-primary-light` and primary text).
- Body row per employee: 28-avatar + name + dept on left; 7 cells right. Each cell is `min-h-20`, `p-1.5`, with template-colored blocks stacked vertically + dashed "+ vagt" button at bottom.
- Assignment block: solid template color, white text, p-2 rounded-sm. Two lines: name 11/700, time 10/0.88-opacity. If `note`, third italic line. **Conflict ⚠️** absolute top-right -5/-5: 16×16 amber circle with 9px alert icon, 2px white border. **This conflict badge must persist whenever `hasAbsenceConflict` is true on the assignment** — don't gate it on the create-response anymore. The server should compute it on every read of `/api/shifts/assignments`. See "Conflict detection" note below.

Add a small legend line below the grid: "⚠️ Markerede vagter har konflikt med godkendt fravær."

#### Vagttyper
Grid `repeat(auto-fill, minmax(280px, 1fr))`. Each Card: 42×42 colored icon block + name + time + dept; footer with Rediger/Slet.

#### Assign modal
Opens on "+ vagt" click. Modal, max-w-md. Heading + meta. Radio list of templates (selected → primary border + primary-light bg). Note input. Buttons.

**Conflict detection (server change):** today `app/api/shifts/assignments/route.ts` returns `hasAbsenceConflict` only on POST. Move the computation into the GET so every assignment row carries `hasAbsenceConflict`. Pseudocode:

```ts
// In GET /api/shifts/assignments
const absences = await prisma.vacationEntry.findMany({
  where: {
    request: { status: "APPROVED", userId: { in: userIds } },
    date: { gte: weekStart, lt: weekEnd },
  },
  select: { userId: true, date: true },
});
const absenceSet = new Set(absences.map(a => `${a.userId}|${a.date.toISOString().slice(0,10)}`));
return assignments.map(a => ({
  ...a,
  hasAbsenceConflict: absenceSet.has(`${a.user.id}|${a.date.toISOString().slice(0,10)}`),
}));
```

### 7. Manager: Kalender — `app/manager/calendar/page.tsx` + `components/CalendarGrid.tsx`

**Design source:** line 433 (`CalendarScreen`).

Sticky-left "Medarbejder" column (min-w-40). One header row with day numbers + day initials (M/T/O/T/F/L/S). Department group header row (full-width `colSpan`, dept-color bg, uppercase white text). Employee rows below: dept-colored dot + name on left, day cells right. Approved cell = `${dept.color}28` bg + dept-colored bold ✓. Pending cell = `#fef3c7` bg + amber bold "?". Weekend cells get `bg-bg`.

Legend row above the table: a chip per dept, plus Afventer + Weekend chips.

**Departments with `shiftsEnabled === false` keep their vacation rows** — only shift-related indicators (if any are added to the calendar later) are hidden for those departments.

### 8. Admin: Brugere — `app/admin/users/AdminUsersClient.tsx`

**Design source:** line 1145 (`UsersScreen`) + line 1075 (`EditUserPanel`).

Header with search box. Card list, one row per user: 38-avatar (gray gradient if inactive) + name + "Inaktiv" pill (only inactive) + email · dept; right side: role pill + "Rediger" ghost button.

**Edit user SlideOver:** Avatar block at top with live preview; "Stamoplysninger" (name + email); Afdeling select; **Rolle** = three big radio cards (Medarbejder / Leder / Administrator) each with description; "Aktiv konto" toggle. Footer: Annuller + Gem ændringer.

**Keep:** Existing `updateUser` action, role enum from Prisma. Department select pulls from the live `Department` query.

### 9. Admin: Afdelinger — `app/admin/departments/DepartmentsClient.tsx`

**Design source:** line 1394 (`DepartmentsScreen`) + line 1257 (`EditDeptPanel`).

#### List
2-column grid of dept cards. Each card:
- Top row: 40-colored icon block + name + member count, **Vagtplan status pill** (green "Vagtplan" if enabled, gray "Ingen vagtplan" if disabled), Rediger ghost
- Bottom row: "Max. samtidige" big colored number, divider, "Medarbejdere" chips (max 4 shown + "+N mere")

#### Edit dept SlideOver
- Afdelingsnavn input
- **Farve** — 8 swatches with selected scale-up + 4px primary-color ring
- **Maks. samtidige feriedage** — −/+ counter, big colored 26/800 number
- **Funktioner** — single big toggle card for Vagtplan with `<Clock>` icon and description. When OFF, show italic note: "Slået fra — vagtplan-menuen skjules og siden er utilgængelig for denne afdeling."
- Medarbejdere list + searchable add picker
- Footer: Annuller + Gem afdeling

#### DB / API changes required

**Add a `shiftsEnabled` column to the `Department` model:**

```prisma
model Department {
  // ...existing fields
  shiftsEnabled Boolean @default(false)
}
```

Migration: `npx prisma migrate dev --name add_shifts_enabled`.

Then wire the field through:

- `app/api/departments/route.ts` POST + `app/api/departments/[id]/route.ts` PATCH — accept `shiftsEnabled` in the body
- `app/admin/departments/page.tsx` — return `shiftsEnabled` in props
- `components/Nav.tsx` — hide `/manager/shifts` link when `session.user.role === "MANAGER"` and that user's department has `shiftsEnabled === false`. ADMIN always sees it.
- `app/manager/shifts/page.tsx` — `redirect("/dashboard")` when the requesting manager's dept has `shiftsEnabled === false`
- `ShiftsClient.tsx` — filter the dept dropdown to `shiftsEnabled === true` (also for ADMIN — admins shouldn't be able to assign shifts to a department that has the feature off)
- `components/CalendarGrid.tsx` — when overlaying shift-indicators on the calendar, skip employees whose dept has `shiftsEnabled === false`

### 10. Admin: Helligdage — `app/admin/holidays/HolidaysClient.tsx`

**Design source:** line 1454 (`HolidaysScreen`).

PageHeader + "Tilføj fridag" primary action. Card with rows: 44-square tinted icon (`flag`, primary tint for national, amber tint for local) + name + date muted + National/Lokal pill + trash ghost.

**Keep:** Existing CRUD calls + the import endpoint.

### 11. Admin: Rapporter — `app/admin/reports/ReportsClient.tsx`

**Design source:** line 1485 (`ReportsScreen`).

Top tab bar (4 tabs):

| Tab | Source design lines |
|---|---|
| Fraværsrapport | 1521 |
| Afdelingsrapport | 1578 |
| Fraværsmønstre | 1620 |
| CSV-eksport | 1683 |

Each tab content matches the existing `ReportsClient.tsx` internal components 1:1 (`AbsenceReport`, `DepartmentReport`, `PatternsReport`, `CsvExport`). **The CSV-export helpers, year/month/dept filters, and ISO-week helper stay byte-identical** — only the surrounding shell, filters bar, and table/card visuals are restyled.

The existing `getISOWeek` helper, `STATUS_LABELS`, `ABSENCE_LABELS`, `MONTHS`, and `downloadCSV` function all stay.

### 12. Admin: Indstillinger — `app/admin/settings/SettingsClient.tsx`

**Design source:** line 1717 (`SettingsScreen`).

Two cards:

1. **Kalendersynlighed** — 42-icon block + heading + description, then two big radio-card options (Alle medarbejdere / Kun ledelse). Maps to `Settings.calendarVisibility` enum (`ALL_EMPLOYEES` | `MANAGEMENT_ONLY`).
2. **Påmindelsestærskel til leder** — 42-amber icon block + heading + description, then a −/+ counter (24/800), "dage" muted, "Deaktiveret" pill when 0. Maps to `Settings.reminderThresholdDays`. Note: "Tjekkes automatisk hver dag kl. 08:00."

Footer: "Gem indstillinger" with inline "✓ Gemt" success label for 2.2s after save.

**Remove:** Any old "auto-approve" / "email notifications" UI — these were never in the schema.

### 13. Profile

**Design source:** line 1782 (`ProfileScreen`).

Three Cards:

1. **Profile card** — 72-avatar with edit overlay button + name + role/dept/email block, then 2-col grid: Fulde navn, Email, Afdeling (read-only — "Afdeling ændres af administrator under Brugere"), Telefon. "Gem ændringer" right-aligned.
2. **Skift adgangskode** — Nuværende, Ny + Bekræft (2-col), "Opdater adgangskode" secondary.
3. **Seneste aktivitet** — list of recent events with small tinted icon + text + time.

**Keep:** Existing `updateProfile` and `changePassword` server actions in `actions/profile.ts`.

### 14. Sidebar — `components/Nav.tsx`

**Design source:** `workplan-ui.jsx` line 242 (`Sidebar`).

Three styles available via Tweaks: `dark` (#0d1117), `light` (surface), `gradient` (linear 180deg #1a1744 → #0d1117). Default to `gradient`. Width 228px, sticky, full-height.

Sections: logo block (gradient 34-square + "WorkPlan" 800), nav items (role-filtered), divider above profile link, footer with avatar + name + role + logout icon.

NavBtn: 9/12 padding, 16px icon left, label, active state = colored bg + bold + 5px colored dot right.

**Mobile:** Match the existing `Nav.tsx` bottom-tab pattern — 5 most-important links + Notif + "Mere" button. The new design tokens apply equally to mobile.

### 15. Notification bell — `components/notifications/NotificationBell.tsx`

**Design source:** `workplan-ui.jsx` line 195 (`TopBar`).

The existing component is already well-architected (`sidebar` / `topbar` / `bottomnav` variants). Restyle each variant:

- Bell button: 36-square rounded-md with 1.5px border, primary-light bg when open
- Unread indicator: 9-dot red bg, 2-white-border, top:6 right:6
- Dropdown: 340-wide, rounded-lg, shadow-lg, max-h 340
- Each item: 13-px-18, accent-tinted 34-icon block when unread, primary-muted bg when unread, 13/600 title + 11.5/muted sub + 11/subtle time + 7-primary unread dot

---

## Interactions & Behavior

- **Dark mode**: toggled via `<html class="dark">`. Persist in localStorage. Add a tiny inline script in `<head>` (before hydration) to set the class to avoid FOUC.
- **Modal/SlideOver**: ESC closes, backdrop click closes. SlideOver translates `28ms cubic-bezier(.4,0,.2,1)`.
- **Buttons**: hover swaps background to the `--hover` token, 0.15s transition.
- **Cards (interactive)**: hover swaps border-color to `--c-border-hover`, raises shadow from xs to md.
- **Tab bars**: pills inside a `--c-border` container, active pill = `--c-surface` bg + xs shadow.
- **Toggles**: 44×24 track, 18-circle thumb, primary when on. 200ms transition.
- **Form focus**: 1.5px border becomes `--c-primary`, plus `0 0 0 3px rgba(36,84,255,.12)` ring.

---

## State Management

No state changes from today. All state is local (component) or driven by:

- NextAuth session
- Next App Router (server components + `useSearchParams`)
- Existing server actions (`actions/manager.ts`, `actions/requests.ts`, `actions/profile.ts`, `actions/notifications.ts`)
- Existing API routes (`app/api/*`)

Do **not** introduce Redux, Zustand, React Query, etc.

---

## Assets

- **Font**: Plus Jakarta Sans via `next/font/google`.
- **Icons**: `lucide-react` (npm install). The prototype's inline-SVG set is illustrative only — don't ship those paths.
- **No images** in the redesign. The login illustration is pure CSS (radial gradients + brand block).
- The existing `public/favicon.ico` stays.

---

## Files in this bundle

- `WorkPlan Redesign.html` — the full prototype, all screens reachable via the left sidebar. Toggle the in-page **Tweaks** panel to flip dark mode, sidebar style, and demo role (EMPLOYEE / MANAGER / ADMIN) to see role-gated screens.
- `workplan-ui.jsx` — shared primitives (`Icon`, `Avatar`, `Btn`, `Card`, `FieldInput`, `PageHeader`, `SectionLabel`, `StatusBadge`, `TopBar`, `Sidebar`). Reference for visual specs — recreate as Tailwind components, do **not** import.
- `tweaks-panel.jsx` — in-design tweak controls. Not relevant to the real app.

---

## Definition of done

A screen is "done" when:

1. It looks pixel-perfect against the corresponding section of `WorkPlan Redesign.html` (both light and dark mode)
2. Every existing server-action / API call / Prisma query that the old screen made still runs unchanged
3. Every existing query-param, redirect, role-gate, and permission check still applies
4. `npm run build` passes cleanly
5. No regressions in: login flow, request approval flow, calendar visibility setting, capacity warning behavior, audit log persistence, CSV exports
