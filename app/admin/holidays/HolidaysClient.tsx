"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Helligdage</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Tilføj helligdag
        </button>
      </div>

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

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
            {initial.map((h) => (
              <tr key={h.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-700">{formatDate(h.date)}</td>
                <td className="px-4 py-3 font-medium">{h.name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {h.isNational ? "National" : "Lokal"}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => del(h.id)} className="text-xs text-red-500 hover:text-red-700">
                    Slet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
