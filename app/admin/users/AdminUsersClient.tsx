"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { SlideOver } from "@/components/ui/SlideOver";
import { FieldInput } from "@/components/ui/FieldInput";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Modal } from "@/components/ui/Modal";
import { Tabs, type TabDef } from "@/components/ui/Tabs";
import { PermissionsEditor } from "@/components/admin/PermissionsEditor";
import { getEffectivePermissions } from "@/lib/can";
import type { Permissions } from "@/lib/permission-types";
import type { UserRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Plus, Search, Pencil, Trash2, Key, User, Shield, Users } from "lucide-react";

interface UserRow {
  id: string; name: string; email: string; role: string;
  departmentId: string | null; department: { name: string } | null;
  canManageShifts: boolean;
  /** Gemte tilladelses-overrides (null = brug rolle-defaults). */
  permissions: unknown;
}
interface Department { id: string; name: string; }

const ROLE_CONFIG = {
  EMPLOYEE: { label: "Medarbejder", color: "var(--c-text-muted)",   bg: "var(--c-bg)",           icon: <User size={16} /> },
  MANAGER:  { label: "Leder",       color: "var(--c-primary)",       bg: "var(--c-primary-muted)", icon: <Users size={16} /> },
  ADMIN:    { label: "Admin",       color: "var(--c-accent)",        bg: "rgba(124,58,237,.12)",   icon: <Shield size={16} /> },
};
const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Medarbejder",   desc: "Kan oprette og se egne ansøgninger" },
  { value: "MANAGER",  label: "Leder",         desc: "Kan godkende/afvise ansøgninger i afdelingen" },
  { value: "ADMIN",    label: "Administrator", desc: "Fuld adgang til alle funktioner" },
];

export default function AdminUsersClient({ users: initialUsers, departments }: { users: UserRow[]; departments: Department[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE", departmentId: "" });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "EMPLOYEE", departmentId: "", newPassword: "", canManageShifts: false });
  const [showPwField, setShowPwField] = useState(false);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  type EditTabId = "profile" | "access" | "permissions";
  const [editTab, setEditTab] = useState<EditTabId>("profile");
  const EDIT_TABS: TabDef<EditTabId>[] = [
    { id: "profile",     label: "Profil" },
    { id: "access",      label: "Adgang" },
    { id: "permissions", label: "Tilladelser" },
  ];

  // Permissions-editor state.
  // showPermissionsEditor styrer sub-slide-overen.
  // pendingPermissions er det "dirty" permissions-objekt der venter på at
  // blive gemt sammen med resten af brugeren — undefined hvis admin ikke
  // har rørt tilladelses-editoren i denne session, null hvis de eksplicit
  // nulstillede til rolle-defaults, ellers et fuldt Permissions-objekt.
  const [showPermissionsEditor, setShowPermissionsEditor] = useState(false);
  const [pendingPermissions, setPendingPermissions] = useState<Permissions | null | undefined>(undefined);

  // Rolleskift-dialog: vises kun når admin er ved at gemme en bruger hvor
  // (a) rollen er ændret OG (b) brugeren har gemte tilladelses-overrides
  // OG (c) admin ikke selv har rørt tilladelser i denne session.
  // Dialogen lader admin vælge mellem at bevare eller nulstille.
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState("");
  const filtered = initialUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Sidste-admin-detektion (klient-side preview af server-guard).
  // adminCount tæller alle admins i listen — bruges til at gøre UI'et
  // smart, men server-side validering i lib/admin-guard.ts er den
  // egentlige sikkerhedslås.
  const adminCount = initialUsers.filter((u) => u.role === "ADMIN").length;
  const isEditingLastAdmin = !!editUser && editUser.role === "ADMIN" && adminCount === 1;

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true); setCreateError("");
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowCreate(false); setForm({ name: "", email: "", password: "", role: "EMPLOYEE", departmentId: "" }); router.refresh(); }
    else { const d = await res.json(); setCreateError(d.error || "Fejl"); }
    setCreateLoading(false);
  }

  function openEdit(u: UserRow) {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? "", newPassword: "", canManageShifts: u.canManageShifts });
    setEditError(""); setShowPwField(false);
    setEditTab("profile");
    setPendingPermissions(undefined);
  }

  /**
   * Beslutter om vi kan gemme direkte eller skal spørge admin først.
   * Rolleskift-dialog vises kun når alle tre er sande:
   *   - rollen ændres
   *   - brugeren har eksisterende DB-overrides
   *   - admin har ikke selv rørt tilladelser i denne session
   * Ellers fortsætter vi direkte til performSave.
   */
  function requestSave() {
    if (!editUser) return;
    const roleChanged = editForm.role !== editUser.role;
    const hasStoredOverrides = editUser.permissions != null;
    const adminTouchedPermissions = pendingPermissions !== undefined;
    if (roleChanged && hasStoredOverrides && !adminTouchedPermissions) {
      setShowRoleChangeDialog(true);
      return;
    }
    performSave();
  }

  /**
   * Sender selve PATCH-requesten. permissionsAction styrer hvad der gøres
   * med permissions-feltet:
   *   - "default": brug pendingPermissions hvis sat, ellers send ikke feltet
   *   - "keep":    eksplicit "send ikke feltet" (bevar nuværende overrides)
   *   - "reset":   send null (nulstil til rolle-defaults)
   */
  async function performSave(permissionsAction: "default" | "keep" | "reset" = "default") {
    if (!editUser) return;
    setEditLoading(true); setEditError("");

    const payload: Record<string, unknown> = {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
      departmentId: editForm.departmentId || null,
      newPassword: editForm.newPassword || undefined,
      canManageShifts: editForm.canManageShifts,
    };

    if (permissionsAction === "reset") {
      payload.permissions = null;
    } else if (permissionsAction === "keep") {
      // Send ikke permissions-feltet — DB-værdien bevares uændret.
    } else if (pendingPermissions !== undefined) {
      payload.permissions = pendingPermissions; // Permissions-objekt eller null
    }

    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) { setEditUser(null); router.refresh(); }
    else { const d = await res.json(); setEditError(d.error || "Fejl ved opdatering"); }
    setEditLoading(false);
  }

  const [deleteError, setDeleteError] = useState("");

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError("");
    const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    if (res.ok) {
      setDeleteTarget(null);
      router.refresh();
    } else {
      // Server kan afvise sletning (fx sidste admin). Vis fejlen i stedet
      // for stille at lukke dialogen som om det lykkedes.
      const d = await res.json().catch(() => ({ error: "Fejl ved sletning" }));
      setDeleteError(d.error || "Fejl ved sletning");
    }
  }

  return (
    <div>
      <PageHeader
        title="Brugere"
        subtitle={`${initialUsers.length} brugere i systemet`}
        actions={<Btn onClick={() => setShowCreate(true)} icon={<Plus size={14} />} size="sm">Ny bruger</Btn>}
      />

      <div className="relative mb-4 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søg navn eller email..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-surface text-text placeholder:text-text-subtle focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]" />
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Users size={28} className="mx-auto mb-2 text-text-subtle" />
            <p className="text-[13px] text-text-muted">Ingen brugere matcher søgningen</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((u) => {
              const rc = ROLE_CONFIG[u.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.EMPLOYEE;
              return (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-bg transition-colors">
                  <Avatar name={u.name} size={38} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text">{u.name}</p>
                    <p className="text-[12px] text-text-muted">{u.email}
                      {u.department && <span className="ml-2 text-text-subtle">· {u.department.name}</span>}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
                    style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(u)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-text-subtle hover:text-primary hover:bg-primary-muted transition-colors">
                      <Pencil size={14} />
                    </button>
                    {(() => {
                      const isLastAdmin = u.role === "ADMIN" && adminCount === 1;
                      return (
                        <button
                          onClick={() => !isLastAdmin && setDeleteTarget(u)}
                          disabled={isLastAdmin}
                          title={isLastAdmin ? "Kan ikke slette den sidste administrator" : undefined}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                            isLastAdmin
                              ? "text-text-subtle/40 cursor-not-allowed"
                              : "text-text-subtle hover:text-danger hover:bg-danger-bg",
                          )}
                        >
                          <Trash2 size={14} />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create SlideOver */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="Opret ny bruger">
        <form onSubmit={createUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput id="c-name" label="Navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <FieldInput id="c-email" label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <FieldInput id="c-pw" label="Adgangskode" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required hint="Mindst 8 tegn" />
            <div>
              <label className="block text-[13px] font-semibold text-text mb-1">Afdeling</label>
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-surface text-sm text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]">
                <option value="">Ingen</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <SectionLabel>Rolle</SectionLabel>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((opt) => (
                <label key={opt.value} className={cn("flex items-start gap-3 p-3 rounded-lg border-[1.5px] cursor-pointer transition-all",
                  form.role === opt.value ? "border-primary bg-primary-light" : "border-border hover:border-border-hover")}>
                  <input type="radio" name="c-role" value={opt.value} checked={form.role === opt.value}
                    onChange={() => setForm({ ...form, role: opt.value })} className="mt-0.5 accent-primary" />
                  <div>
                    <p className="text-[13px] font-semibold text-text">{opt.label}</p>
                    <p className="text-[12px] text-text-muted">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {createError && <p className="text-[12px] text-danger">{createError}</p>}
          <div className="flex gap-2 pt-2">
            <Btn type="submit" disabled={createLoading}>{createLoading ? "Opretter..." : "Opret bruger"}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setShowCreate(false)}>Annuller</Btn>
          </div>
        </form>
      </SlideOver>

      {/* Edit SlideOver — opdelt i tabs (Profil / Adgang / Tilladelser). */}
      <SlideOver open={!!editUser} onClose={() => setEditUser(null)} title="Rediger bruger" subtitle={editUser?.email}>
        <div className="space-y-5">
          {/* Bruger-header (vises på alle tabs) */}
          {editUser && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-bg">
              <Avatar name={editForm.name || editUser.name} size={48} />
              <div>
                <p className="text-[15px] font-bold text-text">{editForm.name || editUser.name}</p>
                <p className="text-[12px] text-text-muted">{editForm.email}</p>
              </div>
            </div>
          )}

          {/* Tab-bar */}
          <Tabs tabs={EDIT_TABS} active={editTab} onChange={setEditTab} />

          {/* Profil-tab — navn, email, afdeling */}
          {editTab === "profile" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Fulde navn" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <FieldInput label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-text mb-1">Afdeling</label>
                <select value={editForm.departmentId} onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-surface text-sm text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]">
                  <option value="">Ingen</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Adgang-tab — rolle + adgangskode */}
          {editTab === "access" && (
            <div className="space-y-5">
              <div>
                <SectionLabel>Rolle</SectionLabel>
                {isEditingLastAdmin && (
                  <p className="text-[12px] text-warning-text bg-warning-bg border border-[rgba(217,119,6,.2)] rounded-md px-3 py-2 mb-3 leading-relaxed">
                    Dette er den sidste administrator i systemet. Rollen kan ikke ændres. Opret en anden administrator først.
                  </p>
                )}
                <div className="space-y-2">
                  {ROLE_OPTIONS.map((opt) => {
                    // Hvis vi redigerer den sidste admin, skal alle ikke-ADMIN-
                    // valg være disabled. Det matcher server-validering så admin
                    // ikke får en fejl efter klik på Gem.
                    const disabled = isEditingLastAdmin && opt.value !== "ADMIN";
                    return (
                      <label key={opt.value} className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border-[1.5px] transition-all",
                        disabled ? "opacity-50 cursor-not-allowed border-border" :
                        editForm.role === opt.value ? "border-primary bg-primary-light cursor-pointer" : "border-border hover:border-border-hover cursor-pointer",
                      )}>
                        <input type="radio" name="e-role" value={opt.value} checked={editForm.role === opt.value}
                          disabled={disabled}
                          onChange={() => setEditForm({ ...editForm, role: opt.value })} className="mt-0.5 accent-primary" />
                        <div>
                          <p className="text-[13px] font-semibold text-text">{opt.label}</p>
                          <p className="text-[12px] text-text-muted">{opt.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <SectionLabel>Adgangskode</SectionLabel>
                {!showPwField ? (
                  <button onClick={() => setShowPwField(true)}
                    className="flex items-center gap-2 text-[13px] text-warning font-semibold hover:text-warning/80 transition-colors">
                    <Key size={14} /> Nulstil adgangskode
                  </button>
                ) : (
                  <FieldInput label="Ny adgangskode" type="password" value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    placeholder="Min. 8 tegn — tom = behold nuværende"
                    hint="Mindst 8 tegn" />
                )}
              </div>
            </div>
          )}

          {/* Tilladelser-tab — fuld tilladelses-editor + legacy canManageShifts */}
          {editTab === "permissions" && (
            <div className="space-y-5">
              <div>
                <SectionLabel>Tilpassede tilladelser</SectionLabel>
                {editForm.role === "ADMIN" ? (
                  // Admin har hard-locked fulde rettigheder uanset DB-værdi
                  // (sikkerhedslås i lib/can.ts). Tilladelser-editoren ville
                  // vildlede admin til at tro deres ændringer virkede.
                  <p className="text-[12px] text-text-muted">
                    Administratorer har altid fulde rettigheder. Tilladelser kan ikke tilpasses for denne rolle.
                  </p>
                ) : (
                  <>
                    <p className="text-[12px] text-text-muted mb-3">
                      Som standard arver brugeren tilladelserne for sin rolle. Du kan tilpasse de enkelte tilladelser herunder.
                    </p>
                    <Btn
                      variant="secondary"
                      size="sm"
                      icon={<Shield size={14} />}
                      onClick={() => setShowPermissionsEditor(true)}
                    >
                      Tilpas tilladelser
                    </Btn>
                    {pendingPermissions !== undefined && (
                      <p className="text-[11px] text-warning mt-2 font-semibold">
                        {pendingPermissions === null
                          ? "Tilladelser nulstilles til rolle-defaults når du gemmer."
                          : "Tilpassede tilladelser afventer gem."}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <SectionLabel>Specialtilladelser</SectionLabel>
                <label className={cn("flex items-center gap-3 p-3 rounded-lg border-[1.5px] cursor-pointer transition-all",
                  editForm.canManageShifts ? "border-primary bg-primary-light" : "border-border hover:border-border-hover")}>
                  <input type="checkbox" checked={editForm.canManageShifts}
                    onChange={(e) => setEditForm({ ...editForm, canManageShifts: e.target.checked })}
                    className="accent-primary w-4 h-4" />
                  <div>
                    <p className="text-[13px] font-semibold text-text">Vagtplan ansvarlig</p>
                    <p className="text-[12px] text-text-muted">Kan oprette, redigere og slette vagter uanset rolle</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {editError && <p className="text-[12px] text-danger">{editError}</p>}
          <div className="flex gap-2 pt-2">
            <Btn onClick={requestSave} disabled={editLoading}>{editLoading ? "Gemmer..." : "Gem ændringer"}</Btn>
            <Btn variant="ghost" onClick={() => setEditUser(null)}>Annuller</Btn>
          </div>
        </div>
      </SlideOver>

      {/* Sekundær slide-over: fuld tilladelses-editor.
          Rendres oven på den primære bruger-slide-over. */}
      {editUser && (
        <PermissionsEditor
          open={showPermissionsEditor}
          onClose={() => setShowPermissionsEditor(false)}
          userName={editForm.name || editUser.name}
          userRole={editForm.role as UserRole}
          // Initial-permissions: hvis admin allerede har redigeret i denne
          // session, brug deres pending-værdi (også null → defaults). Ellers
          // beregn effektive permissions fra brugerens nuværende DB-overrides.
          initial={
            pendingPermissions !== undefined
              ? (pendingPermissions === null
                  ? getEffectivePermissions(editForm.role as UserRole, null)
                  : pendingPermissions)
              : getEffectivePermissions(editForm.role as UserRole, editUser.permissions)
          }
          onSave={(next) => {
            // Persist ikke direkte — gem som "pending" så det sendes med
            // når admin trykker Gem ændringer på den primære slide-over.
            // Det giver mulighed for at fortryde via Annuller, og samler
            // alle ændringer i én PATCH-request.
            setPendingPermissions(next);
          }}
          onResetToRoleDefaults={() => {
            // null signaler til API at vi vil fjerne brugerens overrides.
            // Brugeren arver derefter rolle-defaults — inkl. fremtidige
            // ændringer i koden.
            setPendingPermissions(null);
          }}
        />
      )}

      {/* Rolleskift-dialog: vises når admin er ved at gemme en bruger
          hvor rollen er ændret og brugeren har eksisterende overrides. */}
      {editUser && showRoleChangeDialog && (
        <Modal
          open={showRoleChangeDialog}
          onClose={() => setShowRoleChangeDialog(false)}
          title="Rolleskift"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-warning-bg border border-[rgba(217,119,6,.2)]">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(217,119,6,.15)] text-warning">
                <Shield size={18} />
              </div>
              <div className="text-[13px] leading-relaxed text-warning-text">
                <p className="font-semibold mb-1">
                  {editUser.name} har tilpassede tilladelser
                </p>
                <p>
                  Du ændrer rollen fra <span className="font-semibold">{editUser.role.toLowerCase()}</span> til <span className="font-semibold">{editForm.role.toLowerCase()}</span>.
                  Hvad skal der ske med de eksisterende tilladelses-tilpasninger?
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Btn
                variant="primary"
                full
                onClick={() => {
                  setShowRoleChangeDialog(false);
                  performSave("keep");
                }}
              >
                Bevar tilpassede tilladelser
              </Btn>
              <Btn
                variant="secondary"
                full
                onClick={() => {
                  setShowRoleChangeDialog(false);
                  performSave("reset");
                }}
              >
                Nulstil til {editForm.role.toLowerCase()}-defaults
              </Btn>
              <Btn
                variant="ghost"
                full
                onClick={() => {
                  // Annuller rolleskiftet — sæt rolle tilbage og luk dialogen.
                  // Admin kan så vælge at gemme uden rolleskift eller fortsætte
                  // at redigere.
                  setEditForm({ ...editForm, role: editUser.role });
                  setShowRoleChangeDialog(false);
                }}
              >
                Annullér rolleskift
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Slet-bekræftelse — custom Modal i stedet for ConfirmDialog så vi
          kan vise server-fejl (fx sidste-admin-beskyttelse) inline i stedet
          for at lukke stille som om det lykkedes. */}
      {deleteTarget && (
        <Modal
          open={!!deleteTarget}
          onClose={() => {
            setDeleteTarget(null);
            setDeleteError("");
          }}
          title="Slet bruger"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-danger-bg border border-[rgba(220,38,38,.2)]">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(220,38,38,.15)] text-danger">
                <Trash2 size={18} />
              </div>
              <p className="text-[13px] leading-relaxed text-danger-text">
                Er du sikker på at du vil slette <span className="font-semibold">{deleteTarget.name}</span>?
                Brugeren og alle tilknyttede ansøgninger, vagter og data slettes permanent og kan ikke gendannes.
              </p>
            </div>
            {deleteError && (
              <div className="rounded-md border border-danger-bg bg-danger-bg px-3 py-2 text-[12px] text-danger-text">
                {deleteError}
              </div>
            )}
            <div className="flex gap-2">
              <Btn
                variant="danger"
                full
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Sletter…" : "Slet bruger"}
              </Btn>
              <Btn
                variant="secondary"
                full
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError("");
                }}
                disabled={deleteLoading}
              >
                Annuller
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
