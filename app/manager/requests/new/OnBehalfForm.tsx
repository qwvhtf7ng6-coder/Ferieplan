"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { createRequestOnBehalf } from "@/actions/manager";
import { ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import type { EntryInput, EntryType, AbsenceType } from "@/types";

interface Employee {
  id: string;
  name: string;
  departmentId: string | null;
  department: { name: string } | null;
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  FULL_DAY: "Hel dag",
  HALF_DAY_AM: "Halv dag (formiddag)",
  HALF_DAY_PM: "Halv dag (eftermiddag)",
};

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
    const end = new Date(rangeEnd);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <Alert variant="success">
          Ansøgning oprettet og godkendt for {selectedEmployee?.name}. Omdirigerer...
        </Alert>
      )}

      {errors.map((e, i) => <Alert key={i} variant="error">{e}</Alert>)}

      {/* Employee selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Medarbejder</label>
        <select
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}{emp.department ? ` — ${emp.department.name}` : ""}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Ansøgningen oprettes direkte som godkendt på vegne af medarbejderen.
        </p>
      </div>

      {/* Date range helper */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 mb-3 uppercase tracking-wide">Udfyld fra datointerval</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fra</label>
            <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Til</label>
            <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div className="flex gap-2">
          <select value={rangeAbsenceType} onChange={(e) => setRangeAbsenceType(e.target.value as AbsenceType)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {Object.entries(ABSENCE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button type="button" onClick={fillRange}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            Udfyld
          </button>
        </div>
      </div>

      {/* Entries */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">
            Dage ({entries.length})
          </label>
          <button type="button" onClick={addEntry}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            + Tilføj dag
          </button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {entries.map((entry, i) => {
            const absColor = ABSENCE_TYPE_COLORS[entry.absenceType];
            return (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                <input type="date" value={entry.date}
                  onChange={(e) => updateEntry(i, "date", e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <select value={entry.type} onChange={(e) => updateEntry(i, "type", e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {Object.entries(ENTRY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select value={entry.absenceType} onChange={(e) => updateEntry(i, "absenceType", e.target.value)}
                  style={{ backgroundColor: absColor?.bg, color: absColor?.text }}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {Object.entries(ABSENCE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button type="button" onClick={() => removeEntry(i)}
                  className="text-gray-400 hover:text-red-500 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 flex-shrink-0">
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Note <span className="font-normal text-gray-400">(valgfri)</span>
        </label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500}
          placeholder="F.eks. barsel, sygemelding registreret bagud..."
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={() => router.back()}
          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200">
          Annuller
        </button>
        <button type="submit" disabled={loading || success}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading && <Spinner />}
          Opret og godkend
        </button>
      </div>
    </form>
  );
}
