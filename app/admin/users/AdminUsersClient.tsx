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

const ROLE_BADGE: Record<string, string> = {
  EMPLOYEE: "bg-gray-100 text-gray-600",
  MANAGER: "bg-blue-100 text-blue-700",
  ADMIN: "bg-purple-100 text-purple-700",
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

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", email: "", role: "EMPLOYEE", departmentId: "", newPassword: "",
  });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);

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

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Slet brugeren "${name}"? Dette kan ikke fortrydes.`)) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function startEdit(u: User) {
    setEditId(u.id);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      departmentId: u.departmentId ?? "",
      newPassword: "",
    });
    setEditError("");
    setShowPasswordField(false);
  }

  function cancelEdit() {
    setEditId(null);
    setEditError("");
  }

  async function saveEdit(id: string) {
    setEditLoading(true);
    setEditError("");
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        departmentId: editForm.departmentId || null,
        newPassword: editForm.newPassword || undefined,
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
              <tr key={u.id} className="border-t border-gray-100">
                {editId === u.id ? (
                  <td colSpan={5} className="px-4 py-4 bg-blue-50">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Navn</label>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Rolle</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="EMPLOYEE">Medarbejder</option>
                          <option value="MANAGER">Leder</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Afdeling</label>
                        <select
                          value={editForm.departmentId}
                          onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="">Ingen</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Password reset */}
                    <div className="mb-3">
                      {!showPasswordField ? (
                        <button
                          type="button"
                          onClick={() => setShowPasswordField(true)}
                          className="text-xs text-orange-600 hover:text-orange-800 underline"
                        >
                          Nulstil adgangskode
                        </button>
                      ) : (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Ny adgangskode <span className="text-gray-400">(min. 6 tegn)</span></label>
                          <input
                            type="password"
                            value={editForm.newPassword}
                            onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                            placeholder="Lad være tom for at beholde nuværende"
                            className="w-full max-w-xs border border-orange-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        </div>
                      )}
                    </div>

                    {editError && <p className="text-red-600 text-xs mb-2">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(u.id)}
                        disabled={editLoading}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                      >
                        {editLoading ? "Gemmer..." : "Gem ændringer"}
                      </button>
                      <button onClick={cancelEdit} className="text-xs text-gray-500 px-2 py-1.5 hover:text-gray-700">
                        Annuller
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.department?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(u)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 py-1 px-2 rounded"
                        >
                          Rediger
                        </button>
                        <button
                          onClick={() => deleteUser(u.id, u.name)}
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
        {initialUsers.map((u) => (
          <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-4">
            {editId === u.id ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rediger bruger</p>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Navn</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Rolle</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="EMPLOYEE">Medarbejder</option>
                    <option value="MANAGER">Leder</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Afdeling</label>
                  <select
                    value={editForm.departmentId}
                    onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Ingen</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {!showPasswordField ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordField(true)}
                    className="text-xs text-orange-600 hover:text-orange-800 underline"
                  >
                    Nulstil adgangskode
                  </button>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Ny adgangskode <span className="text-gray-400">(min. 6 tegn)</span></label>
                    <input
                      type="password"
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                      placeholder="Tom = behold nuværende"
                      className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                )}

                {editError && <p className="text-red-600 text-xs">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(u.id)}
                    disabled={editLoading}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editLoading ? "Gemmer..." : "Gem ændringer"}
                  </button>
                  <button onClick={cancelEdit} className="text-xs text-gray-500 px-3 py-2">
                    Annuller
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                    {u.department && (
                      <span className="text-xs text-gray-500">{u.department.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(u)}
                    className="text-xs text-blue-600 hover:text-blue-800 py-1 px-2"
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => deleteUser(u.id, u.name)}
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
