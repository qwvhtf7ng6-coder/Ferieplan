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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Afdelinger</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Ny afdeling
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 flex gap-3 items-end">
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
            <label className="block text-xs text-gray-600 mb-1">Max samtidige</label>
            <input
              type="number"
              min="1"
              value={form.maxConcurrent}
              onChange={(e) => setForm({ ...form, maxConcurrent: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
            />
          </div>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            Opret
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500">Annuller</button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
              <tr key={d.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 text-gray-600">{d.maxConcurrent}</td>
                <td className="px-4 py-3 text-gray-500">{d._count.users}</td>
                <td className="px-4 py-3">
                  <button onClick={() => del(d.id)} className="text-xs text-red-500 hover:text-red-700">Slet</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
