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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { Plus, Search, Pencil, Trash2, Key, User, Shield, Users } from "lucide-react";

interface UserRow {
  id: string; name: string; email: string; role: string;
  departmentId: string | null; department: { name: string } | null;
  canManageShifts: boolean;
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

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState("");
  const filtered = initialUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

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
  }

  async function saveEdit() {
    if (!editUser) return;
    setEditLoading(true); setEditError("");
    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name, email: editForm.email, role: editForm.role, departmentId: editForm.departmentId || null, newPassword: editForm.newPassword || undefined, canManageShifts: editForm.canManageShifts }),
    });
    if (res.ok) { setEditUser(null); router.refresh(); }
    else { const d = await res.json(); setEditError(d.error || "Fejl ved opdatering"); }
    setEditLoading(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    setDeleteTarget(null);
    router.refresh();
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
                    <button onClick={() => setDeleteTarget(u)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-text-subtle hover:text-danger hover:bg-danger-bg transition-colors">
                      <Trash2 size={14} />
                    </button>
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

      {/* Edit SlideOver */}
      <SlideOver open={!!editUser} onClose={() => setEditUser(null)} title="Rediger bruger" subtitle={editUser?.email}>
        <div className="space-y-5">
          {editUser && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-bg">
              <Avatar name={editForm.name || editUser.name} size={48} />
              <div>
                <p className="text-[15px] font-bold text-text">{editForm.name || editUser.name}</p>
                <p className="text-[12px] text-text-muted">{editForm.email}</p>
              </div>
            </div>
          )}
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
          <div>
            <SectionLabel>Rolle</SectionLabel>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((opt) => (
                <label key={opt.value} className={cn("flex items-start gap-3 p-3 rounded-lg border-[1.5px] cursor-pointer transition-all",
                  editForm.role === opt.value ? "border-primary bg-primary-light" : "border-border hover:border-border-hover")}>
                  <input type="radio" name="e-role" value={opt.value} checked={editForm.role === opt.value}
                    onChange={() => setEditForm({ ...editForm, role: opt.value })} className="mt-0.5 accent-primary" />
                  <div>
                    <p className="text-[13px] font-semibold text-text">{opt.label}</p>
                    <p className="text-[12px] text-text-muted">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Tilladelser</SectionLabel>
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
          {editError && <p className="text-[12px] text-danger">{editError}</p>}
          <div className="flex gap-2 pt-2">
            <Btn onClick={saveEdit} disabled={editLoading}>{editLoading ? "Gemmer..." : "Gem ændringer"}</Btn>
            <Btn variant="ghost" onClick={() => setEditUser(null)}>Annuller</Btn>
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Slet bruger"
        message={`Er du sikker på at du vil slette ${deleteTarget?.name}? Brugeren og alle tilknyttede ansøgninger, vagter og data slettes permanent og kan ikke gendannes.`}
        confirmLabel={deleteLoading ? "Sletter…" : "Slet bruger"}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
