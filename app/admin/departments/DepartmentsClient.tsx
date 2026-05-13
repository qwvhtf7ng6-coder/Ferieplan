"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
  maxConcurrent: number;
  _count: { users: number };
}

export default function DepartmentsClient({ departments: initial }: { departments: Department[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", maxConcurrent: "2" });
  const [loading, setLoading] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, maxConcurrent: parseInt(form.maxConcurrent) }),
    });
    setShowForm(false);
    setForm({ name: "", maxConcurrent: "2" });
    setLoading(false);
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm("Slet afdeling?")) return;
    await fetch(`/api/departments/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-xl font-bold text-gray-800">Afdelinger</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0"
        >
          + Ny afdeling
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">Opret ny afdeling</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="dept-name" className="block text-xs text-gray-600 mb-1">Navn</label>
              <input
                id="dept-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label htmlFor="dept-max" className="block text-xs text-gray-600 mb-1">Max samtidige</label>
              <input
                id="dept-max"
                type="number"
                min="1"
                value={form.maxConcurrent}
                onChange={(e) => setForm({ ...form, maxConcurrent: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Opretter..." : "Opret"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-3 py-2">
              Annuller
            </button>
          </div>
        </form>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Navn</th>
              <th className="px-4 py-3 text-left">Max samtidige</th>
              <th className="px-4 py-3 text-left">Brugere</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {initial.map((d) => (
              <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 text-gray-600">{d.maxConcurrent}</td>
                <td className="px-4 py-3 text-gray-500">{d._count.users}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => del(d.id)}
                    className="text-xs text-red-500 hover:text-red-700 py-1 px-2"
                    aria-label={`Slet ${d.name}`}
                  >
                    Slet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-3">
        {initial.map((d) => (
          <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{d.name}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span>Max {d.maxConcurrent} samtidige</span>
                  <span>{d._count.users} brugere</span>
                </div>
              </div>
              <button
                onClick={() => del(d.id)}
                className="text-xs text-red-500 hover:text-red-700 py-1 px-2 shrink-0"
                aria-label={`Slet ${d.name}`}
              >
                Slet
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
