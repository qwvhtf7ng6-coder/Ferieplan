"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { FieldInput } from "@/components/ui/FieldInput";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Flag, Trash2, Download, Plus } from "lucide-react";

interface Holiday {
  id: string;
  name: string;
  date: string;
  isNational: boolean;
}

export default function HolidaysClient({ holidays: initial }: { holidays: Holiday[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", isNational: true });
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const [importYear, setImportYear] = useState(String(currentYear));
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", date: "", isNational: true });
    setLoading(false);
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm("Slet helligdag?")) return;
    await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function importHolidays() {
    setImportLoading(true);
    setImportMsg(null);
    const res = await fetch("/api/holidays/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: importYear }),
    });
    const data = await res.json();
    if (data.ok) {
      setImportMsg({ ok: true, text: `${data.inserted} helligdage importeret for ${data.year} (${data.skipped} fandtes allerede)` });
      router.refresh();
    } else {
      setImportMsg({ ok: false, text: data.error ?? "Fejl ved import" });
    }
    setImportLoading(false);
  }

  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const sorted = [...initial].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div>
      <PageHeader
        title="Helligdage"
        subtitle={`${sorted.length} helligdage registreret`}
        actions={
          <Btn onClick={() => setShowForm(!showForm)} icon={<Plus size={14} />} size="sm">
            Tilføj manuelt
          </Btn>
        }
      />

      {/* Import card */}
      <Card className="p-5 mb-5" style={{ background: "var(--c-primary-light)" }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--c-primary-muted)", color: "var(--c-primary)" }}>
            <Download size={16} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-text">Importer danske helligdage automatisk</p>
            <p className="text-[12px] text-text-muted mt-0.5">
              Henter fra Nager.Date API — inkluderer nytår, påske, pinse, grundlovsdag og jul.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="import-year" className="block text-[12px] font-semibold text-text mb-1">År</label>
            <select
              id="import-year"
              value={importYear}
              onChange={(e) => setImportYear(e.target.value)}
              className="border border-border rounded-md px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary"
            >
              {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <Btn onClick={importHolidays} disabled={importLoading} icon={<Download size={14} />} size="sm">
            {importLoading ? "Importerer..." : "Importer"}
          </Btn>
        </div>
        {importMsg && (
          <p className={`mt-3 text-[12px] font-medium ${importMsg.ok ? "text-success" : "text-danger"}`}>
            {importMsg.text}
          </p>
        )}
      </Card>

      {/* Manual form */}
      {showForm && (
        <Card className="p-5 mb-5">
          <SectionLabel>Tilføj helligdag manuelt</SectionLabel>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput
                id="h-name"
                label="Navn"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <FieldInput
                id="h-date"
                label="Dato"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-[13px] text-text">
              <input
                type="checkbox"
                checked={form.isNational}
                onChange={(e) => setForm({ ...form, isNational: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              National helligdag
            </label>
            <div className="flex gap-2">
              <Btn type="submit" disabled={loading} size="sm">
                {loading ? "Tilføjer..." : "Tilføj"}
              </Btn>
              <Btn type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Annuller
              </Btn>
            </div>
          </form>
        </Card>
      )}

      {/* List */}
      {sorted.length === 0 ? (
        <Card className="py-14 text-center">
          <Flag size={28} className="mx-auto mb-2 text-text-subtle" />
          <p className="text-[13px] text-text-muted">Ingen helligdage endnu — brug import-knappen ovenfor.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {sorted.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: h.isNational ? "var(--c-primary-muted)" : "rgba(217,119,6,.1)",
                    color: h.isNational ? "var(--c-primary)" : "var(--c-warning)",
                  }}>
                  <Flag size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-text">{h.name}</p>
                  <p className="text-[12px] text-text-muted">{formatDate(h.date)}</p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  h.isNational
                    ? "bg-primary-light text-primary"
                    : "bg-warning-bg text-warning-text"
                }`}>
                  {h.isNational ? "National" : "Lokal"}
                </span>
                <button
                  onClick={() => del(h.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-text-subtle hover:text-danger hover:bg-danger-bg transition-colors"
                  aria-label={`Slet ${h.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
