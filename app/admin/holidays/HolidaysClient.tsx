"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

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
      setImportMsg({
        ok: true,
        text: `${data.inserted} helligdage importeret for ${data.year} (${data.skipped} fandtes allerede)`,
      });
      router.refresh();
    } else {
      setImportMsg({ ok: false, text: data.error ?? "Fejl ved import" });
    }
    setImportLoading(false);
  }

  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Helligdage</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Tilføj manuelt
        </button>
      </div>

      {/* Auto-import */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold text-blue-800 mb-1">
          Importer danske helligdage automatisk
        </p>
        <p className="text-xs text-blue-600 mb-3">
          Henter fra Nager.Date API — inkluderer nytår, påske, pinse, grundlovsdag og jul. Store bededag er ekskluderet.
        </p>
        <div className="flex gap-3 items-center flex-wrap">
          <select
            value={importYear}
            onChange={(e) => setImportYear(e.target.value)}
            className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <button
            onClick={importHolidays}
            disabled={importLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {importLoading && <Spinner />}
            {importLoading ? "Importerer..." : "Importer"}
          </button>
        </div>
        {importMsg && (
          <div className="mt-3">
            <Alert variant={importMsg.ok ? "success" : "error"}>{importMsg.text}</Alert>
          </div>
        )}
      </div>

      {/* Manual form */}
      {showForm && (
        <form onSubmit={create} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Navn</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Dato</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isNational"
                checked={form.isNational}
                onChange={(e) => setForm({ ...form, isNational: e.target.checked })}
              />
              <label htmlFor="isNational" className="text-sm text-gray-600">National</label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "..." : "Tilføj"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500">
              Annuller
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {initial.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Ingen helligdage endnu — brug import-knappen ovenfor.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Dato</th>
                <th className="px-4 py-3 text-left">Navn</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {initial
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((h) => (
                  <tr key={h.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{formatDate(h.date)}</td>
                    <td className="px-4 py-3 font-medium">{h.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {h.isNational ? "National" : "Lokal"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => del(h.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Slet
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
