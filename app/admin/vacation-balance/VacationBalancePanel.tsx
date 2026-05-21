"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { SlideOver } from "@/components/ui/SlideOver";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Pencil, ChevronLeft, ChevronRight, TrendingUp, Users, Check } from "lucide-react";

export interface BalanceRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  year: number;
  totalDays: number;
  carryOverDays: number;
  allottedDays: number;
  usedDays: number;
  remainingDays: number;
  note: string | null;
}

function BalanceBar({ used, allotted }: { used: number; allotted: number }) {
  const pct = allotted > 0 ? Math.min(100, (used / allotted) * 100) : 0;
  const color =
    pct >= 100 ? "var(--c-danger)" : pct >= 80 ? "var(--c-warning)" : "var(--c-success)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[11px] font-semibold text-text-muted shrink-0">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

/**
 * VacationBalancePanel — embeddable variant af VacationBalanceClient.
 * Forskelle fra Client:
 *  - Ingen PageHeader (årsskifter ligger nu i lokal panel-header).
 *  - Årsskifte navigerer til /admin/settings?tab=balance&year=... så tab-state bevares.
 *    Vi inkluderer altid tab=balance i URL'en så hard-refresh viser den rigtige tab.
 */
export default function VacationBalancePanel({
  rows: initialRows,
  year: initialYear,
}: {
  rows: BalanceRow[];
  year: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [year, setYear] = useState(initialYear);
  const [rows, setRows] = useState(initialRows);
  const [editRow, setEditRow] = useState<BalanceRow | null>(null);
  const [form, setForm] = useState({ totalDays: 25, carryOverDays: 0, note: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  function changeYear(delta: number) {
    const y = year + delta;
    setYear(y);
    startTransition(() => {
      router.push(`/admin/settings?tab=balance&year=${y}`);
    });
  }

  function openEdit(row: BalanceRow) {
    setEditRow(row);
    setForm({
      totalDays: row.totalDays,
      carryOverDays: row.carryOverDays,
      note: row.note ?? "",
    });
    setSaveError("");
    setSavedId(null);
  }

  async function saveBalance() {
    if (!editRow) return;
    setSaving(true);
    setSaveError("");
    const res = await fetch(`/api/vacation-balance/${editRow.userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        totalDays: form.totalDays,
        carryOverDays: form.carryOverDays,
        note: form.note || null,
      }),
    });
    if (res.ok) {
      setSavedId(editRow.userId);
      setRows((prev) =>
        prev.map((r) =>
          r.userId === editRow.userId
            ? {
                ...r,
                totalDays: form.totalDays,
                carryOverDays: form.carryOverDays,
                allottedDays: form.totalDays + form.carryOverDays,
                remainingDays: form.totalDays + form.carryOverDays - r.usedDays,
                note: form.note || null,
              }
            : r,
        ),
      );
      setTimeout(() => setEditRow(null), 600);
    } else {
      const d = await res.json();
      setSaveError(d.error || "Fejl ved gemning");
    }
    setSaving(false);
  }

  const totalAllotted = rows.reduce((s, r) => s + r.allottedDays, 0);
  const totalUsed = rows.reduce((s, r) => s + r.usedDays, 0);

  return (
    <div>
      {/* Lokal panel-header med årsskifter */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[15px] font-bold text-text">Feriedagsregnskab</p>
          <p className="text-[12px] text-text-muted mt-0.5">
            {rows.length} medarbejdere · {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeYear(-1)}
            className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors"
            aria-label="Forrige år"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[15px] font-bold text-text w-12 text-center">{year}</span>
          <button
            type="button"
            onClick={() => changeYear(1)}
            className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors"
            aria-label="Næste år"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          {
            label: "Medarbejdere",
            value: rows.length,
            icon: <Users size={18} />,
            color: "#4f46e5",
            bg: "rgba(79,70,229,.1)",
          },
          {
            label: "Tildelte dage i alt",
            value: totalAllotted,
            icon: <TrendingUp size={18} />,
            color: "#059669",
            bg: "rgba(5,150,105,.1)",
          },
          {
            label: "Brugte dage i alt",
            value: +totalUsed.toFixed(1),
            icon: <TrendingUp size={18} />,
            color: "#d97706",
            bg: "rgba(217,119,6,.1)",
          },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div
              className="w-[38px] h-[38px] rounded-lg flex items-center justify-center mb-3"
              style={{ background: s.bg, color: s.color }}
            >
              {s.icon}
            </div>
            <p
              className="text-[28px] font-extrabold tracking-[-0.03em] leading-none"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
            <p className="text-[12px] font-semibold text-text-muted mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* User list */}
      <SectionLabel>Medarbejdere</SectionLabel>
      <div className="mt-2 flex flex-col gap-2">
        {rows.map((row) => (
          <Card key={row.userId} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar name={row.name} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-text truncate">{row.name}</p>
                    <p className="text-[11px] text-text-subtle mt-0.5">
                      {row.department ?? "Ingen afdeling"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wide">
                        Tildelt
                      </p>
                      <p className="text-[17px] font-extrabold tracking-tight text-text leading-tight">
                        {row.allottedDays}
                        {row.carryOverDays > 0 && (
                          <span className="text-[11px] font-semibold text-text-subtle ml-1">
                            +{row.carryOverDays}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wide">
                        Brugt
                      </p>
                      <p
                        className="text-[17px] font-extrabold tracking-tight leading-tight"
                        style={{
                          color:
                            row.usedDays > row.allottedDays ? "var(--c-danger)" : "var(--c-text)",
                        }}
                      >
                        {row.usedDays}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wide">
                        Tilbage
                      </p>
                      <p
                        className="text-[17px] font-extrabold tracking-tight leading-tight"
                        style={{
                          color:
                            row.remainingDays < 0
                              ? "var(--c-danger)"
                              : row.remainingDays <= 5
                                ? "var(--c-warning)"
                                : "var(--c-success)",
                        }}
                      >
                        {row.remainingDays}
                      </p>
                    </div>
                    <Btn
                      variant="ghost"
                      size="sm"
                      icon={<Pencil size={13} />}
                      onClick={() => openEdit(row)}
                    >
                      Rediger
                    </Btn>
                  </div>
                </div>
                <div className="mt-2">
                  <BalanceBar used={row.usedDays} allotted={row.allottedDays} />
                </div>
                {row.note && (
                  <p className="text-[11px] text-text-subtle mt-1.5 italic">{row.note}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center text-text-subtle text-[13px]">
            Ingen medarbejdere fundet.
          </div>
        )}
      </div>

      {/* Edit slide-over */}
      <SlideOver
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title="Rediger feriedagsregnskab"
        subtitle={editRow ? `${editRow.name} · ${year}` : ""}
        width={480}
      >
        {editRow && (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <Avatar name={editRow.name} size={40} />
              <div>
                <p className="text-[14px] font-semibold text-text">{editRow.name}</p>
                <p className="text-[12px] text-text-muted">
                  {editRow.department ?? "Ingen afdeling"}
                </p>
              </div>
            </div>

            <SectionLabel>Saldo for {year}</SectionLabel>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-text-muted mb-1.5">
                  Feriedage i alt
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, totalDays: Math.max(0, f.totalDays - 0.5) }))
                    }
                    className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    step={0.5}
                    value={form.totalDays}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, totalDays: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-20 h-9 text-center text-[18px] font-extrabold text-text bg-bg border border-border rounded-md focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, totalDays: Math.min(365, f.totalDays + 0.5) }))
                    }
                    className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-bold"
                  >
                    +
                  </button>
                  <span className="text-[13px] text-text-muted">dage</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-text-muted mb-1.5">
                  Overførte dage (fra foregående år)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        carryOverDays: Math.max(0, f.carryOverDays - 0.5),
                      }))
                    }
                    className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    step={0.5}
                    value={form.carryOverDays}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, carryOverDays: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-20 h-9 text-center text-[18px] font-extrabold text-text bg-bg border border-border rounded-md focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        carryOverDays: Math.min(365, f.carryOverDays + 0.5),
                      }))
                    }
                    className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-bold"
                  >
                    +
                  </button>
                  <span className="text-[13px] text-text-muted">dage</span>
                </div>
              </div>

              <Card className="p-3 bg-primary-light border-primary/30">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wide">
                      Total
                    </p>
                    <p className="text-[20px] font-extrabold text-primary">
                      {form.totalDays + form.carryOverDays}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wide">
                      Brugt
                    </p>
                    <p className="text-[20px] font-extrabold text-text">{editRow.usedDays}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wide">
                      Tilbage
                    </p>
                    <p
                      className="text-[20px] font-extrabold"
                      style={{
                        color:
                          form.totalDays + form.carryOverDays - editRow.usedDays < 0
                            ? "var(--c-danger)"
                            : "var(--c-success)",
                      }}
                    >
                      {form.totalDays + form.carryOverDays - editRow.usedDays}
                    </p>
                  </div>
                </div>
              </Card>

              <div>
                <label className="block text-[12px] font-semibold text-text-muted mb-1.5">
                  Note (valgfri)
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  rows={2}
                  placeholder="F.eks. særlig aftale om feriedage..."
                  className="w-full px-3 py-2 text-[13px] text-text bg-bg border border-border rounded-md focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            {saveError && (
              <p className="text-[12px] text-danger font-semibold">{saveError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Btn
                onClick={saveBalance}
                disabled={saving}
                icon={savedId === editRow.userId ? <Check size={14} /> : undefined}
              >
                {saving ? "Gemmer..." : "Gem saldo"}
              </Btn>
              <Btn variant="secondary" onClick={() => setEditRow(null)}>
                Annuller
              </Btn>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
