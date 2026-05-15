"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
  maxConcurrent: number;
  shiftsEnabled: boolean;
  _count: { users: number };
}

export default function DepartmentsClient({ departments: initial }: { departments: Department[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", maxConcurrent: "2", shiftsEnabled: true });
  const [loading, setLoading] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", maxConcurrent: "2", shiftsEnabled: true });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        maxConcurrent: parseInt(form.maxConcurrent),
        shiftsEnabled: form.shiftsEnabled,
      }),
    });
    setShowForm(false);
    setForm({ name: "", maxConcurrent: "2", shiftsEnabled: true });
    setLoading(false);
    router.refresh();
  }

  async function del(id: string, name: string) {
    if (!confirm(`Slet afdelingen "${name}"? Dette kan ikke fortrydes.`)) return;
    await fetch(`/api/departments/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function startEdit(d: Department) {
    setEditId(d.id);
    setEditForm({ name: d.name, maxConcurrent: String(d.maxConcurrent), shiftsEnabled: d.shiftsEnabled });
    setEditError("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditError("");
  }

  async function saveEdit(id: string) {
    setEditLoading(true);
    setEditError("");
    const res = await fetch(`/api/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        maxConcurrent: parseInt(editForm.maxConcurrent),
        shiftsEnabled: editForm.shiftsEnabled,
      }),
    });
    if (res.ok) {
      setEditId(null);
      router.refresh();
    } else {
      const d = await res.json();
      setEditError(d.error || "Fejl ved opdatering");
    }
    setEditLoading(false);
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
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={form.shiftsEnabled}
              onClick={() => setForm({ ...form, shiftsEnabled: !form.shiftsEnabled })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
                form.shiftsEnabled ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.shiftsEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">Vagtplan aktiveret</span>
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
              <th className="px-4 py-3 text-left">Vagtplan</th>
              <th className="px-4 py-3 text-left">Brugere</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {initial.map((d) => (
              <tr key={d.id} className="border-t border-gray-100">
                {editId === d.id ? (
                  <td colSpan={5} className="px-4 py-3 bg-blue-50">
                    <div className="flex items-center gap-3 flex-wrap">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Navn"
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 whitespace-nowrap">Max samtidige:</label>
                        <input
                          type="number"
                          min="1"
                          value={editForm.maxConcurrent}
                          onChange={(e) => setEditForm({ ...editForm, maxConcurrent: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={editForm.shiftsEnabled}
                          onClick={() => setEditForm({ ...editForm, shiftsEnabled: !editForm.shiftsEnabled })}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
                            editForm.shiftsEnabled ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              editForm.shiftsEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-xs text-gray-600 whitespace-nowrap">Vagtplan</span>
                      </div>
                      {editError && <p className="text-red-600 text-xs">{editError}</p>}
                      <div className="flex gap-2 ml-auto">
                        <button
                          onClick={() => saveEdit(d.id)}
                          disabled={editLoading}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                          {editLoading ? "Gemmer..." : "Gem"}
                        </button>
                        <button onClick={cancelEdit} className="text-xs text-gray-500 px-2 py-1.5 hover:text-gray-700">
                          Annuller
                        </button>
                      </div>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.maxConcurrent}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.shiftsEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {d.shiftsEnabled ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d._count.users}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(d)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 py-1 px-2 rounded"
                        >
                          Rediger
                        </button>
                        <button
                          onClick={() => del(d.id, d.name)}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 py-1 px-2 rounded"
                        >
                          Slet
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-3">
        {initial.map((d) => (
          <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-4">
            {editId === d.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Navn</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max samtidige</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.maxConcurrent}
                    onChange={(e) => setEditForm({ ...editForm, maxConcurrent: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editForm.shiftsEnabled}
                    onClick={() => setEditForm({ ...editForm, shiftsEnabled: !editForm.shiftsEnabled })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
                      editForm.shiftsEnabled ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        editForm.shiftsEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-700">Vagtplan aktiveret</span>
                </div>
                {editError && <p className="text-red-600 text-xs">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(d.id)}
                    disabled={editLoading}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editLoading ? "Gemmer..." : "Gem"}
                  </button>
                  <button onClick={cancelEdit} className="text-xs text-gray-500 px-3 py-2">
                    Annuller
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{d.name}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                    <span>Max {d.maxConcurrent} samtidige</span>
                    <span>{d._count.users} brugere</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                      d.shiftsEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      Vagtplan: {d.shiftsEnabled ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(d)}
                    className="text-xs text-blue-600 hover:text-blue-800 py-1 px-2"
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => del(d.id, d.name)}
                    className="text-xs text-red-500 hover:text-red-700 py-1 px-2"
                  >
                    Slet
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
