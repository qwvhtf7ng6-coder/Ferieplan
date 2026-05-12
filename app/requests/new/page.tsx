"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useSession } from "next-auth/react";
import { format, addDays, eachDayOfInterval, isWeekend } from "date-fns";

interface EntryRow {
  date: string;
  type: "FULL_DAY" | "HALF_DAY_AM" | "HALF_DAY_PM";
}

export default function NewRequestPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [entries, setEntries] = useState<EntryRow[]>([
    { date: format(new Date(), "yyyy-MM-dd"), type: "FULL_DAY" },
  ]);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function addRow() {
    setEntries([...entries, { date: format(new Date(), "yyyy-MM-dd"), type: "FULL_DAY" }]);
  }

  function removeRow(i: number) {
    setEntries(entries.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof EntryRow, value: string) {
    const updated = [...entries];
    updated[i] = { ...updated[i], [field]: value };
    setEntries(updated);
  }

  function addRange() {
    if (!rangeStart || !rangeEnd) return;
    const days = eachDayOfInterval({
      start: new Date(rangeStart),
      end: new Date(rangeEnd),
    }).filter((d) => !isWeekend(d));
    const newEntries = days.map((d) => ({
      date: format(d, "yyyy-MM-dd"),
      type: "FULL_DAY" as const,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    setRangeStart("");
    setRangeEnd("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (entries.length === 0) {
      setError("Tilføj mindst én dato");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries, note }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Fejl ved oprettelse");
      setLoading(false);
    }
  }

  if (!session) return null;

  return (
    <div>
      <Nav role={user?.role} name={user?.name ?? ""} />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Ny ferieansøgning</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Range picker */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-3">Tilføj datointerval (hverdage)</p>
            <div className="flex gap-2 items-end flex-wrap">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fra</label>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Til</label>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={addRange}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
              >
                Tilføj interval
              </button>
            </div>
          </div>

          {/* Individual entries */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Datolinjer</p>
            <div className="space-y-2">
              {entries.map((entry, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) => updateRow(i, "date", e.target.value)}
                    required
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <select
                    value={entry.type}
                    onChange={(e) => updateRow(i, "type", e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="FULL_DAY">Hel dag</option>
                    <option value="HALF_DAY_AM">Halvdag (formiddag)</option>
                    <option value="HALF_DAY_PM">Halvdag (eftermiddag)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              + Tilføj dato
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (valgfri)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="F.eks. sommerferie, bryllup..."
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Sender..." : "Indsend ansøgning"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Annuller
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
