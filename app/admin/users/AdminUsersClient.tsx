"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  department: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Medarbejder",
  MANAGER: "Leder",
  ADMIN: "Admin",
};

export default function AdminUsersClient({
  users: initialUsers,
  departments,
}: {
  users: User[];
  departments: Department[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE", departmentId: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "EMPLOYEE", departmentId: "" });
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "Fejl");
    }
    setLoading(false);
  }

  async function deleteUser(id: string) {
    if (!confirm("Slet bruger?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-xl font-bold text-gray-800">Brugere</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0"
        >
          + Ny bruger
        </button>
      </div>

      {showForm && (
        <form onSubmit={createUser} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">Opret ny bruger</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="u-name" className="block text-xs text-gray-600 mb-1">Navn</label>
              <input
                id="u-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label htmlFor="u-email" className="block text-xs text-gray-600 mb-1">Email</label>
              <input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label htmlFor="u-password" className="block text-xs text-gray-600 mb-1">Adgangskode</label>
              <input
                id="u-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label htmlFor="u-role" className="block text-xs text-gray-600 mb-1">Rolle</label>
              <select
                id="u-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="EMPLOYEE">Medarbejder</option>
                <option value="MANAGER">Leder</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="u-dept" className="block text-xs text-gray-600 mb-1">Afdeling</label>
              <select
                id="u-dept"
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Ingen</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
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
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rolle</th>
              <th className="px-4 py-3 text-left">Afdeling</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-600">{ROLE_LABELS[u.role] ?? u.role}</td>
                <td className="px-4 py-3 text-gray-500">{u.department?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="text-xs text-red-500 hover:text-red-700 py-1 px-2"
                    aria-label={`Slet ${u.name}`}
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
        {initialUsers.map((u) => (
          <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                  {u.department && (
                    <span className="text-xs text-gray-500">{u.department.name}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteUser(u.id)}
                className="text-xs text-red-500 hover:text-red-700 py-1 px-2 shrink-0"
                aria-label={`Slet ${u.name}`}
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
