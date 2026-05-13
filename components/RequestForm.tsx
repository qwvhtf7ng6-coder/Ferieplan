"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { createVacationRequest } from "@/actions/requests";
import { validateCreateRequest } from "@/lib/validation";
import { ENTRY_TYPE_LABELS, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import type { EntryInput, EntryType, AbsenceType } from "@/types";

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
    setEntries((prev) => [
      ...prev,
      { date: format(new Date(), "yyyy-MM-dd"), type: "FULL_DAY", absenceType: "VACATION" },
    ]);
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateEntry(i: number, field: keyof EntryInput, value: string) {
    setEntries((prev) =>
      prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e)
    );
  }

  function addRange() {
    if (!rangeStart || !rangeEnd) return;
    if (rangeStart > rangeEnd) {
      setErrors(["'Fra'-dato må ikke være efter 'til'-dato"]);
      return;
    }
    const days = eachDayOfInterval({
      start: new Date(rangeStart),
      end: new Date(rangeEnd),
    }).filter((d) => !isWeekend(d));

    if (days.length === 0) {
      setErrors(["Ingen hverdage i det valgte interval"]);
      return;
    }

    setEntries((prev) => [
      ...prev,
      ...days.map((d) => ({
        date: format(d, "yyyy-MM-dd"),
        type: "FULL_DAY" as EntryType,
        absenceType: rangeAbsenceType,
      })),
    ]);
    setRangeStart("");
    setRangeEnd("");
    setErrors([]);
  }

  function clearAll() {
    setEntries([]);
    setErrors([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);

    const validationErrors = validateCreateRequest({ entries, note });
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => e.message));
      return;
    }

    setLoading(true);
    const result = await createVacationRequest({ entries, note: note.trim() || undefined });

    if (!result.ok) {
      setErrors([result.error ?? "Ukendt fejl"]);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Range picker */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-3">Tilføj datointerval</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label htmlFor="range-start" className="block text-xs text-blue-700 mb-1">Fra</label>
            <input id="range-start" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)}
              className="w-full border border-blue-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label htmlFor="range-end" className="block text-xs text-blue-700 mb-1">Til</label>
            <input id="range-end" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)}
              className="w-full border border-blue-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label htmlFor="range-absence" className="block text-xs text-blue-700 mb-1">Fraværstype</label>
            <select id="range-absence" value={rangeAbsenceType} onChange={(e) => setRangeAbsenceType(e.target.value as AbsenceType)}
              className="w-full border border-blue-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {Object.entries(ABSENCE_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={addRange} disabled={!rangeStart || !rangeEnd}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors whitespace-nowrap">
            Tilføj hverdage
          </button>
        </div>
        <p className="text-xs text-blue-600 mt-2">Weekender springes automatisk over</p>
      </section>

      {/* Entry rows */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">
            Datolinjer <span className="font-normal text-gray-400">({entries.length})</span>
          </p>
          {entries.length > 0 && (
            <button type="button" onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 py-1 px-2">
              Ryd alle
            </button>
          )}
        </div>

        {entries.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-xl">
            Ingen datoer valgt endnu
          </p>
        )}

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {entries.map((entry, i) => {
            const absColor = ABSENCE_TYPE_COLORS[entry.absenceType];
            return (
              <div key={i} className="flex gap-2 items-center">
                {/* Absence type colour indicator */}
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: absColor?.text ?? "#6b7280" }} aria-hidden="true" />
                <input type="date" value={entry.date} onChange={(e) => updateEntry(i, "date", e.target.value)}
                  required aria-label={`Dato ${i + 1}`}
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-36 shrink-0" />
                <select value={entry.absenceType} onChange={(e) => updateEntry(i, "absenceType", e.target.value)}
                  aria-label={`Fraværstype for dato ${i + 1}`}
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1 min-w-0">
                  {Object.entries(ABSENCE_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <select value={entry.type} onChange={(e) => updateEntry(i, "type", e.target.value)}
                  aria-label={`Dagtype for dato ${i + 1}`}
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shrink-0">
                  {Object.entries(ENTRY_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeEntry(i)} aria-label={`Fjern dato ${i + 1}`}
                  className="w-8 h-9 flex items-center justify-center text-gray-300 hover:text-red-500 text-xl shrink-0">
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={addEntry} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium py-1">
          + Tilføj enkelt dato
        </button>
      </section>

      {/* Note */}
      <section>
        <label htmlFor="request-note" className="block text-sm font-semibold text-gray-700 mb-1">
          Note <span className="font-normal text-gray-400">(valgfri)</span>
        </label>
        <textarea id="request-note" value={note} onChange={(e) => setNote(e.target.value)}
          maxLength={500} rows={3} placeholder="F.eks. sommerferie, bryllup, konference..."
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        <p className="text-xs text-gray-400 mt-1 text-right">{note.length}/500</p>
      </section>

      {errors.length > 0 && (
        <Alert variant="error">
          <ul className="space-y-0.5">{errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
        </Alert>
      )}

      {success && <Alert variant="success">Ansøgning indsendt — du viderstilles...</Alert>}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
        <button type="button" onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-center">
          Annuller
        </button>
        <button type="submit" disabled={loading || success || entries.length === 0}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex-1 sm:flex-none">
          {loading && <Spinner />}
          {loading ? "Sender..." : "Indsend ansøgning"}
        </button>
      </div>
    </form>
  );
}
