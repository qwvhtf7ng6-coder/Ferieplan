"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { createVacationRequest } from "@/actions/requests";
import { validateCreateRequest } from "@/lib/validation";
import { ENTRY_TYPE_LABELS, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FieldTextarea } from "@/components/ui/FieldInput";
import { CheckCircle, Plus, Trash2, X, Send } from "lucide-react";
import type { EntryInput, EntryType, AbsenceType } from "@/types";

const INPUT_CLS = "border border-border rounded-md px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)] transition-colors";
const SELECT_CLS = INPUT_CLS;

export function RequestForm() {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryInput[]>([
    { date: format(new Date(), "yyyy-MM-dd"), type: "FULL_DAY", absenceType: "VACATION" },
  ]);
  const [note, setNote] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeAbsenceType, setRangeAbsenceType] = useState<AbsenceType>("VACATION");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function addEntry() {
    setEntries((prev) => [...prev, { date: format(new Date(), "yyyy-MM-dd"), type: "FULL_DAY", absenceType: "VACATION" }]);
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateEntry(i: number, field: keyof EntryInput, value: string) {
    setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }

  function addRange() {
    if (!rangeStart || !rangeEnd) return;
    if (rangeStart > rangeEnd) { setErrors(["'Fra'-dato må ikke være efter 'til'-dato"]); return; }
    const days = eachDayOfInterval({ start: new Date(rangeStart), end: new Date(rangeEnd) }).filter((d) => !isWeekend(d));
    if (days.length === 0) { setErrors(["Ingen hverdage i det valgte interval"]); return; }
    setEntries((prev) => [...prev, ...days.map((d) => ({ date: format(d, "yyyy-MM-dd"), type: "FULL_DAY" as EntryType, absenceType: rangeAbsenceType }))]);
    setRangeStart(""); setRangeEnd(""); setErrors([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    const validationErrors = validateCreateRequest({ entries, note });
    if (validationErrors.length > 0) { setErrors(validationErrors.map((e) => e.message)); return; }
    setLoading(true);
    const result = await createVacationRequest({ entries, note: note.trim() || undefined });
    if (!result.ok) { setErrors([result.error ?? "Ukendt fejl"]); setLoading(false); return; }
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 1400);
  }

  if (success) {
    return (
      <div className="py-12 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--c-success-bg)" }}>
          <CheckCircle size={32} style={{ color: "var(--c-success)" }} />
        </div>
        <div>
          <p className="text-[17px] font-extrabold text-text">Ansøgning indsendt!</p>
          <p className="text-[13px] text-text-muted mt-1">Du viderstilles til oversigten…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Date range card */}
      <Card className="p-5" style={{ background: "var(--c-primary-light)" }}>
        <SectionLabel>Datointerval</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label htmlFor="range-start" className="block text-[12px] font-semibold text-text mb-1">Fra</label>
            <input id="range-start" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className={`w-full ${INPUT_CLS}`} />
          </div>
          <div>
            <label htmlFor="range-end" className="block text-[12px] font-semibold text-text mb-1">Til</label>
            <input id="range-end" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className={`w-full ${INPUT_CLS}`} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label htmlFor="range-absence" className="block text-[12px] font-semibold text-text mb-1">Fraværstype</label>
            <select id="range-absence" value={rangeAbsenceType} onChange={(e) => setRangeAbsenceType(e.target.value as AbsenceType)} className={`w-full ${SELECT_CLS}`}>
              {Object.entries(ABSENCE_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          <Btn type="button" onClick={addRange} disabled={!rangeStart || !rangeEnd} icon={<Plus size={14} />} size="sm">
            Tilføj hverdage
          </Btn>
        </div>
        <p className="text-[11px] text-text-muted mt-2">Weekender springes automatisk over</p>
      </Card>

      {/* Entry rows card */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel className="mb-0">
            Datolinjer <span className="font-normal normal-case tracking-normal text-text-subtle">({entries.length})</span>
          </SectionLabel>
          {entries.length > 0 && (
            <button type="button" onClick={() => setEntries([])}
              className="flex items-center gap-1 text-[12px] text-text-subtle hover:text-danger transition-colors">
              <Trash2 size={12} /> Ryd alle
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="py-6 text-center border-[1.5px] border-dashed border-border rounded-lg">
            <p className="text-[13px] text-text-subtle">Ingen datoer valgt endnu</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {entries.map((entry, i) => {
              const absColor = ABSENCE_TYPE_COLORS[entry.absenceType];
              return (
                <div key={i} className="flex gap-2 items-center bg-bg rounded-md p-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: absColor?.text ?? "var(--c-text-subtle)" }} />
                  <input type="date" value={entry.date} onChange={(e) => updateEntry(i, "date", e.target.value)}
                    required aria-label={`Dato ${i + 1}`} className={`${INPUT_CLS} w-36 shrink-0`} />
                  <select value={entry.absenceType} onChange={(e) => updateEntry(i, "absenceType", e.target.value)}
                    aria-label={`Fraværstype for dato ${i + 1}`} className={`${SELECT_CLS} flex-1 min-w-0`}>
                    {Object.entries(ABSENCE_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                  <select value={entry.type} onChange={(e) => updateEntry(i, "type", e.target.value)}
                    aria-label={`Dagtype for dato ${i + 1}`} className={`${SELECT_CLS} shrink-0`}>
                    {Object.entries(ENTRY_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                  <button type="button" onClick={() => removeEntry(i)} aria-label={`Fjern dato ${i + 1}`}
                    className="w-7 h-7 flex items-center justify-center text-text-subtle hover:text-danger rounded transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button type="button" onClick={addEntry}
          className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-primary-hover transition-colors">
          <Plus size={14} /> Tilføj enkelt dato
        </button>
      </Card>

      {/* Note card */}
      <Card className="p-5">
        <FieldTextarea
          id="request-note"
          label="Note"
          hint={`${note.length}/500 — valgfri`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="F.eks. sommerferie, bryllup, konference…"
        />
      </Card>

      {errors.length > 0 && (
        <div className="p-3.5 rounded-lg bg-danger-bg border border-[rgba(220,38,38,.2)] text-[13px] text-danger-text">
          <ul className="space-y-0.5">{errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-1">
        <Btn type="button" variant="secondary" onClick={() => router.back()}>Annuller</Btn>
        <Btn type="submit" disabled={loading || entries.length === 0} icon={<Send size={14} />}>
          {loading ? "Sender…" : "Indsend ansøgning"}
        </Btn>
      </div>
    </form>
  );
}
