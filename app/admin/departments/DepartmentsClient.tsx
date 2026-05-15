"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { SlideOver } from "@/components/ui/SlideOver";
import { FieldInput } from "@/components/ui/FieldInput";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Toggle } from "@/components/ui/Toggle";
import { Plus, Building2, Pencil, Trash2, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
  maxConcurrent: number;
  shiftsEnabled: boolean;
  _count: { users: number };
}

const DEPT_COLORS = ["#4f46e5","#7c3aed","#059669","#d97706","#dc2626","#0891b2","#db2777","#65a30d"];

export default function DepartmentsClient({ departments: initial }: { departments: Department[] }) {
  const router = useRouter();

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", maxConcurrent: "2", shiftsEnabled: true, color: DEPT_COLORS[0] });
  const [createLoading, setCreateLoading] = useState(false);

  // Edit
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [editForm, setEditForm] = useState({ name: "", maxConcurrent: "2", shiftsEnabled: true, color: DEPT_COLORS[0] });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    await fetch("/api/departments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, maxConcurrent: parseInt(form.maxConcurrent), shiftsEnabled: form.shiftsEnabled }),
    });
    setShowCreate(false);
    setForm({ name: "", maxConcurrent: "2", shiftsEnabled: true, color: DEPT_COLORS[0] });
    setCreateLoading(false);
    router.refresh();
  }

  function openEdit(d: Department) {
    setEditDept(d);
    setEditForm({ name: d.name, maxConcurrent: String(d.maxConcurrent), shiftsEnabled: d.shiftsEnabled, color: DEPT_COLORS[0] });
    setEditError("");
  }

  async function saveEdit() {
    if (!editDept) return;
    setEditLoading(true); setEditError("");
    const res = await fetch(`/api/departments/${editDept.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name, maxConcurrent: parseInt(editForm.maxConcurrent), shiftsEnabled: editForm.shiftsEnabled }),
    });
    if (res.ok) { setEditDept(null); router.refresh(); }
    else { const d = await res.json(); setEditError(d.error || "Fejl"); }
    setEditLoading(false);
  }

  async function del(id: string, name: string) {
    if (!confirm(`Slet afdelingen "${name}"? Dette kan ikke fortrydes.`)) return;
    await fetch(`/api/departments/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Afdelinger"
        subtitle={`${initial.length} afdelinger`}
        actions={<Btn onClick={() => setShowCreate(true)} icon={<Plus size={14} />} size="sm">Ny afdeling</Btn>}
      />

      {initial.length === 0 ? (
        <Card className="py-14 text-center">
          <Building2 size={28} className="mx-auto mb-2 text-text-subtle" />
          <p className="text-[13px] text-text-muted">Ingen afdelinger endnu</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {initial.map((d, i) => {
            const color = DEPT_COLORS[i % DEPT_COLORS.length];
            return (
              <Card key={d.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${color}20`, color }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-text">{d.name}</p>
                      <p className="text-[12px] text-text-muted">{d._count.users} medarbejdere</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full",
                      d.shiftsEnabled ? "bg-[var(--c-success-bg)] text-[var(--c-success-text)]" : "bg-bg text-text-subtle"
                    )}>
                      {d.shiftsEnabled ? "Vagtplan" : "Ingen vagtplan"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-[24px] font-extrabold tracking-tight" style={{ color }}>{d.maxConcurrent}</span>
                    <span className="text-[11px] text-text-muted leading-tight">max.<br/>samtidige</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(d)}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-text-muted hover:text-primary hover:bg-primary-muted px-2.5 py-1.5 rounded-md transition-colors">
                      <Pencil size={12} /> Rediger
                    </button>
                    <button onClick={() => del(d.id, d.name)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-text-subtle hover:text-danger hover:bg-danger-bg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create SlideOver */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="Opret ny afdeling">
        <form onSubmit={create} className="space-y-5">
          <FieldInput id="d-name" label="Afdelingsnavn" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />

          <div>
            <SectionLabel>Maks. samtidige feriedage</SectionLabel>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setForm({ ...form, maxConcurrent: String(Math.max(1, parseInt(form.maxConcurrent) - 1)) })}
                className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-bold">−</button>
              <span className="text-[26px] font-extrabold text-primary w-10 text-center">{form.maxConcurrent}</span>
              <button type="button" onClick={() => setForm({ ...form, maxConcurrent: String(parseInt(form.maxConcurrent) + 1) })}
                className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-bold">+</button>
            </div>
          </div>

          <div>
            <SectionLabel>Funktioner</SectionLabel>
            <div className={cn(
              "flex items-start gap-4 p-4 rounded-lg border-[1.5px] transition-all",
              form.shiftsEnabled ? "border-primary bg-primary-light" : "border-border bg-bg"
            )}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: form.shiftsEnabled ? "var(--c-primary-muted)" : "var(--c-bg)", color: form.shiftsEnabled ? "var(--c-primary)" : "var(--c-text-subtle)" }}>
                <Clock size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-text">Vagtplan</p>
                <p className="text-[12px] text-text-muted mt-0.5">
                  {form.shiftsEnabled ? "Aktiveret — vagtplan-menuen vises for denne afdeling." : "Slået fra — vagtplan-menuen skjules og siden er utilgængelig."}
                </p>
              </div>
              <Toggle checked={form.shiftsEnabled} onChange={(v) => setForm({ ...form, shiftsEnabled: v })} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Btn type="submit" disabled={createLoading}>{createLoading ? "Opretter..." : "Opret afdeling"}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setShowCreate(false)}>Annuller</Btn>
          </div>
        </form>
      </SlideOver>

      {/* Edit SlideOver */}
      <SlideOver open={!!editDept} onClose={() => setEditDept(null)}
        title="Rediger afdeling" subtitle={editDept?.name}>
        <div className="space-y-5">
          <FieldInput label="Afdelingsnavn" value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />

          <div>
            <SectionLabel>Maks. samtidige feriedage</SectionLabel>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setEditForm({ ...editForm, maxConcurrent: String(Math.max(1, parseInt(editForm.maxConcurrent) - 1)) })}
                className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-bold">−</button>
              <span className="text-[26px] font-extrabold text-primary w-10 text-center">{editForm.maxConcurrent}</span>
              <button type="button" onClick={() => setEditForm({ ...editForm, maxConcurrent: String(parseInt(editForm.maxConcurrent) + 1) })}
                className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-bold">+</button>
            </div>
          </div>

          <div>
            <SectionLabel>Funktioner</SectionLabel>
            <div className={cn(
              "flex items-start gap-4 p-4 rounded-lg border-[1.5px] transition-all",
              editForm.shiftsEnabled ? "border-primary bg-primary-light" : "border-border bg-bg"
            )}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: editForm.shiftsEnabled ? "var(--c-primary-muted)" : "var(--c-bg)", color: editForm.shiftsEnabled ? "var(--c-primary)" : "var(--c-text-subtle)" }}>
                <Clock size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-text">Vagtplan</p>
                <p className="text-[12px] text-text-muted mt-0.5">
                  {editForm.shiftsEnabled ? "Aktiveret — vagtplan-menuen vises for denne afdeling." : "Slået fra — vagtplan-menuen skjules og siden er utilgængelig."}
                </p>
              </div>
              <Toggle checked={editForm.shiftsEnabled} onChange={(v) => setEditForm({ ...editForm, shiftsEnabled: v })} />
            </div>
          </div>

          {editError && <p className="text-[12px] text-danger">{editError}</p>}
          <div className="flex gap-2 pt-2">
            <Btn onClick={saveEdit} disabled={editLoading}>{editLoading ? "Gemmer..." : "Gem afdeling"}</Btn>
            <Btn variant="ghost" onClick={() => setEditDept(null)}>Annuller</Btn>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
