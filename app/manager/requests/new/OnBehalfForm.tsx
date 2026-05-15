"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { createRequestOnBehalf } from "@/actions/manager";
import { ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { FieldTextarea } from "@/components/ui/FieldInput";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Avatar } from "@/components/ui/Avatar";
import { CheckCircle, Plus, Trash2, X, Send } from "lucide-react";
import type { EntryInput, EntryType, AbsenceType } from "@/types";

interface Employee {
  id: string;
  name: string;
  departmentId: string | null;
  department: { name: string } | null;
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  FULL_DAY:    "Hel dag",
  HALF_DAY_AM: "Halv dag (formiddag)",
  HALF_DAY_PM: "Halv dag (eftermiddag)",
};

const INPUT_CLS =
  "border border-border rounded-md px-3 py-2 text-sm bg-surface text-text " +
  "focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)] transition-colors";

export function OnBehalfForm({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [targetUserId, setTargetUserId] = useState(employees[0]?.id ?? "");
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
    setEntries((p) => [...p, { date: format(new Date(), "yyyy-MM-dd"), type: "FULL_DAY", absenceType: "VACATION" }]);
  }

  function removeEntry(i: number) {
    setEntries((p) => p.filter((_, idx) => idx !== i));
  }

  function updateEntry(i: number, field: keyof EntryInput, value: string) {
    setEntries((p) => p.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }

  function fillRange() {
    if (!rangeStart || !rangeEnd) return;
    const start = new Date(rangeStart);
    const end   = new Date(rangeEnd);
    if (start > end) { setErrors(["Slutdato skal være efter startdato"]); return; }
    const days = eachDayOfInterval({ start, end })
      .filter((d) => !isWeekend(d))
      .map((d) => ({ date: format(d, "yyyy-MM-dd"), type: "FULL_DAY" as EntryType, absenceType: rangeAbsenceType }));
    if (days.length === 0) { setErrors(["Ingen hverdage i det valgte interval"]); return; }
    setEntries(days);
    setErrors([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    if (!targetUserId) { setErrors(["Vælg en medarbejder"]); return; }
    if (entries.length === 0) { setErrors(["Mindst én dato er påkrævet"]); return; }
    setLoading(true);
    const result = await createRequestOnBehalf({ targetUserId, entries, note: note || undefined });
    if (result.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/manager/requests"), 1500);
    } else {
      setErrors([result.error ?? "Ukendt fejl"]);
      setLoading(false);
    }
  }

  const selectedEmployee = employees.find((e) => e.id === targetUserId);

  // ── Success state ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="py-14 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "var(--c-success-bg)" }}>
          <CheckCircle size={32} style={{ color: "var(--c-success)" }} />
        </div>
        <div>
          <p className="text-[17px] font-extrabold text-text">Ansøgning oprettet!</p>
          <p className="text-[13px] text-text-muted mt-1">
            Godkendt på vegne af {selectedEmployee?.name}. Omdirigerer…
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ── Medarbejder ── */}
      <Card className="p-5">
        <SectionLabel>Medarbejder</SectionLabel>
        <select
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          required
          className={`w-full ${INPUT_CLS}`}
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}{emp.department ? ` — ${emp.department.name}` : ""}
            </option>
          ))}
        </select>

        {/* Live preview of selected employee */}
        {selectedEmployee && (
          <div className="flex items-center gap-3 mt-3 p-3 rounded-lg bg-bg">
            <Avatar name={selectedEmployee.name} size={36} />
            <div>
              <p className="text-[13px] font-semibold text-text">{selectedEmployee.name}</p>
              {selectedEmployee.department && (
                <p className="text-[12px] text-text-muted">{selectedEmployee.department.name}</p>
              )}
            </div>
          </div>
        )}

        <p className="text-[12px] text-text-subtle mt-3">
          Ansøgningen oprettes direkte som godkendt — nyttigt ved sygdom, barsel eller bagudregistrering.
        </p>
      </Card>

      {/* ── Datointerval ── */}
      <Card className="p-5" style={{ background: "var(--c-primary-light)" }}>
        <SectionLabel>Udfyld fra datointerval</SectionLabel>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[12px] font-semibold text-text mb-1">Fra</label>
            <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)}
              className={`w-full ${INPUT_CLS}`} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text mb-1">Til</label>
            <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)}
              className={`w-full ${INPUT_CLS}`} />
          </div>
        </div>
        <div className="flex gap-2">
          <select value={rangeAbsenceType} onChange={(e) => setRangeAbsenceType(e.target.value as AbsenceType)}
            className={`flex-1 ${INPUT_CLS}`}>
            {Object.entries(ABSENCE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <Btn type="button" onClick={fillRange} disabled={!rangeStart || !rangeEnd} size="sm">
            Udfyld
          </Btn>
        </div>
        <p className="text-[11px] text-text-muted mt-2">Weekender springes automatisk over</p>
      </Card>

      {/* ── Datolinjer ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel className="mb-0">
            Datolinjer{" "}
            <span className="font-normal normal-case tracking-normal text-text-subtle">
              ({entries.length})
            </span>
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
            <p className="text-[13px] text-text-subtle">Ingen datoer — brug intervallet ovenfor eller tilføj manuelt</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {entries.map((entry, i) => {
              const absColor = ABSENCE_TYPE_COLORS[entry.absenceType];
              return (
                <div key={i} className="flex items-center gap-2 bg-bg rounded-md p-2">
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: absColor?.text ?? "var(--c-text-subtle)" }} />
                  <input type="date" value={entry.date}
                    onChange={(e) => updateEntry(i, "date", e.target.value)}
                    aria-label={`Dato ${i + 1}`}
                    className={`${INPUT_CLS} w-36 shrink-0`} />
                  <select value={entry.absenceType}
                    onChange={(e) => updateEntry(i, "absenceType", e.target.value)}
                    aria-label={`Fraværstype for dato ${i + 1}`}
                    className={`${INPUT_CLS} flex-1 min-w-0`}>
                    {Object.entries(ABSENCE_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <select value={entry.type}
                    onChange={(e) => updateEntry(i, "type", e.target.value)}
                    aria-label={`Dagtype for dato ${i + 1}`}
                    className={`${INPUT_CLS} shrink-0`}>
                    {Object.entries(ENTRY_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeEntry(i)}
                    aria-label={`Fjern dato ${i + 1}`}
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
          <Plus size={14} /> Tilføj dag manuelt
        </button>
      </Card>

      {/* ── Note ── */}
      <Card className="p-5">
        <FieldTextarea
          id="behalf-note"
          label="Note"
          hint={`${note.length}/500 — valgfri`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="F.eks. barsel, sygemelding registreret bagud…"
        />
      </Card>

      {/* ── Errors ── */}
      {errors.map((err, i) => (
        <p key={i} className="text-[12px] text-danger bg-danger-bg px-3.5 py-2.5 rounded-md">
          {err}
        </p>
      ))}

      {/* ── Actions ── */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-1">
        <Btn type="button" variant="secondary" onClick={() => router.back()}>
          Annuller
        </Btn>
        <Btn
          type="submit"
          disabled={loading || entries.length === 0}
          icon={<Send size={14} />}
        >
          {loading ? "Opretter…" : "Opret og godkend"}
        </Btn>
      </div>
    </form>
  );
}
