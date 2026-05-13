"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { da } from "date-fns/locale";

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  departmentId: string | null;
  department: { name: string } | null;
}

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  departmentId: string;
  department: { name: string };
}

interface ShiftAssignment {
  id: string;
  date: string;
  note: string | null;
  user: { id: string; name: string };
  template: ShiftTemplate & { department: { name: string } };
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
];

function WeekNav({
  weekStart,
  onChange,
}: {
  weekStart: Date;
  onChange: (d: Date) => void;
}) {
  const weekEnd = addDays(weekStart, 6);
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addDays(weekStart, -7))}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        aria-label="Forrige uge"
      >
        ←
      </button>
      <span className="text-sm font-semibold text-gray-700 min-w-[180px] text-center">
        {format(weekStart, "d. MMM", { locale: da })} –{" "}
        {format(weekEnd, "d. MMM yyyy", { locale: da })}
      </span>
      <button
        onClick={() => onChange(addDays(weekStart, 7))}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        aria-label="Næste uge"
      >
        →
      </button>
      <button
        onClick={() =>
          onChange(startOfWeek(new Date(), { weekStartsOn: 1 }))
        }
        className="ml-1 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
      >
        I dag
      </button>
    </div>
  );
}

export default function ShiftsClient({
  departments,
  employees,
  isAdmin,
  managerDepartmentId,
}: {
  departments: Department[];
  employees: Employee[];
  isAdmin: boolean;
  managerDepartmentId: string | null;
}) {
  const [tab, setTab] = useState<"plan" | "templates">("plan");
  const [selectedDeptId, setSelectedDeptId] = useState(
    isAdmin ? (departments[0]?.id ?? "") : (managerDepartmentId ?? "")
  );

  // Week state
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Data state
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [tplForm, setTplForm] = useState({
    name: "", startTime: "08:00", endTime: "16:00", color: "#3b82f6",
  });
  const [tplLoading, setTplLoading] = useState(false);
  const [editTplId, setEditTplId] = useState<string | null>(null);

  // Assignment modal
  const [assignModal, setAssignModal] = useState<{
    date: Date; userId: string;
  } | null>(null);
  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Filter employees by dept
  const deptEmployees = employees.filter(
    (e) => !selectedDeptId || e.departmentId === selectedDeptId
  );
  const deptTemplates = templates.filter(
    (t) => !selectedDeptId || t.departmentId === selectedDeptId
  );

  // Load templates
  const loadTemplates = useCallback(async () => {
    const qs = selectedDeptId ? `?departmentId=${selectedDeptId}` : "";
    const res = await fetch(`/api/shifts/templates${qs}`);
    if (res.ok) setTemplates(await res.json());
  }, [selectedDeptId]);

  // Load assignments for week
  const loadAssignments = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      weekStart: format(weekStart, "yyyy-MM-dd"),
      ...(selectedDeptId ? { departmentId: selectedDeptId } : {}),
    });
    const res = await fetch(`/api/shifts/assignments?${qs}`);
    if (res.ok) setAssignments(await res.json());
    setLoading(false);
  }, [weekStart, selectedDeptId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function getAssignmentsForCell(userId: string, date: Date) {
    return assignments.filter(
      (a) => a.user.id === userId && isSameDay(parseISO(a.date), date)
    );
  }

  async function deleteAssignment(id: string) {
    await fetch(`/api/shifts/assignments/${id}`, { method: "DELETE" });
    loadAssignments();
  }

  async function createAssignment() {
    if (!assignModal || !assignTemplateId) return;
    setAssignLoading(true);
    setAssignError("");
    const res = await fetch("/api/shifts/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: assignModal.userId,
        templateId: assignTemplateId,
        date: format(assignModal.date, "yyyy-MM-dd"),
        note: assignNote || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setAssignModal(null);
      setAssignTemplateId("");
      setAssignNote("");
      loadAssignments();
    } else {
      setAssignError(data.error || "Fejl");
    }
    setAssignLoading(false);
  }

  // Template CRUD
  async function saveTemplate() {
    setTplLoading(true);
    const method = editTplId ? "PATCH" : "POST";
    const url = editTplId
      ? `/api/shifts/templates/${editTplId}`
      : "/api/shifts/templates";

    const body = editTplId
      ? tplForm
      : { ...tplForm, departmentId: selectedDeptId };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowTemplateForm(false);
      setEditTplId(null);
      setTplForm({ name: "", startTime: "08:00", endTime: "16:00", color: "#3b82f6" });
      loadTemplates();
    }
    setTplLoading(false);
  }

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`Slet vagtskabelonen "${name}"?`)) return;
    await fetch(`/api/shifts/templates/${id}`, { method: "DELETE" });
    loadTemplates();
  }

  function startEditTemplate(t: ShiftTemplate) {
    setEditTplId(t.id);
    setTplForm({ name: t.name, startTime: t.startTime, endTime: t.endTime, color: t.color });
    setShowTemplateForm(true);
  }

  const today = new Date();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vagtplan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Planlæg og se medarbejdervagter</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && departments.length > 1 && (
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alle afdelinger</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab("plan")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "plan"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Ugeplan
        </button>
        <button
          onClick={() => setTab("templates")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "templates"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Vagttyper
        </button>
      </div>

      {/* ── PLAN TAB ── */}
      {tab === "plan" && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <WeekNav weekStart={weekStart} onChange={setWeekStart} />
            {deptEmployees.length === 0 && (
              <p className="text-sm text-gray-400">Ingen medarbejdere i afdelingen</p>
            )}
          </div>

          {deptTemplates.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
              Opret vagttyper under fanen <strong>Vagttyper</strong> før du kan planlægge vagter.
            </div>
          )}

          {/* Desktop grid */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header row */}
              <div
                className="grid text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1"
                style={{ gridTemplateColumns: `180px repeat(7, 1fr)` }}
              >
                <div className="px-3 py-2">Medarbejder</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`px-2 py-2 text-center rounded-lg ${
                      isSameDay(day, today) ? "bg-blue-50 text-blue-700" : ""
                    }`}
                  >
                    <div>{format(day, "EEE", { locale: da })}</div>
                    <div className="text-base font-bold mt-0.5">{format(day, "d")}</div>
                  </div>
                ))}
              </div>

              {/* Employee rows */}
              {deptEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="grid border-t border-gray-100"
                  style={{ gridTemplateColumns: `180px repeat(7, 1fr)` }}
                >
                  <div className="px-3 py-3 flex items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900 leading-tight">{emp.name}</p>
                      {isAdmin && emp.department && (
                        <p className="text-xs text-gray-400">{emp.department.name}</p>
                      )}
                    </div>
                  </div>
                  {weekDays.map((day) => {
                    const cellAssignments = getAssignmentsForCell(emp.id, day);
                    const isToday = isSameDay(day, today);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[72px] px-1 py-1 border-l border-gray-100 ${
                          isToday ? "bg-blue-50/40" : ""
                        }`}
                      >
                        {cellAssignments.map((a) => (
                          <div
                            key={a.id}
                            className="group relative mb-1 rounded-lg px-2 py-1 text-white text-xs leading-tight cursor-default"
                            style={{ backgroundColor: a.template.color }}
                          >
                            <div className="font-semibold">{a.template.name}</div>
                            <div className="opacity-80">
                              {a.template.startTime}–{a.template.endTime}
                            </div>
                            {a.note && (
                              <div className="opacity-70 italic mt-0.5 truncate">{a.note}</div>
                            )}
                            <button
                              onClick={() => deleteAssignment(a.id)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex"
                              title="Fjern vagt"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {deptTemplates.length > 0 && (
                          <button
                            onClick={() => {
                              setAssignModal({ date: day, userId: emp.id });
                              setAssignTemplateId(deptTemplates[0]?.id ?? "");
                              setAssignNote("");
                              setAssignError("");
                            }}
                            className="w-full text-xs text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded py-0.5 transition-colors mt-0.5"
                            title="Tilføj vagt"
                          >
                            + vagt
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {deptEmployees.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Ingen medarbejdere at vise
                </div>
              )}
            </div>
          </div>

          {/* Mobile: card per employee */}
          <div className="md:hidden space-y-4">
            {deptEmployees.map((emp) => {
              const empAssignments = assignments.filter((a) => a.user.id === emp.id);
              return (
                <div key={emp.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <p className="font-semibold text-gray-900 text-sm">{emp.name}</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {weekDays.map((day) => {
                      const cellA = getAssignmentsForCell(emp.id, day);
                      const isToday = isSameDay(day, today);
                      return (
                        <div
                          key={day.toISOString()}
                          className={`px-4 py-2.5 flex items-center gap-3 ${isToday ? "bg-blue-50/40" : ""}`}
                        >
                          <div className={`text-xs w-16 shrink-0 ${isToday ? "font-bold text-blue-700" : "text-gray-500"}`}>
                            {format(day, "EEE d.", { locale: da })}
                          </div>
                          <div className="flex-1 flex flex-wrap gap-1">
                            {cellA.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1 text-white text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: a.template.color }}
                              >
                                {a.template.name}
                                <button onClick={() => deleteAssignment(a.id)} className="hover:opacity-70">×</button>
                              </span>
                            ))}
                            {deptTemplates.length > 0 && (
                              <button
                                onClick={() => {
                                  setAssignModal({ date: day, userId: emp.id });
                                  setAssignTemplateId(deptTemplates[0]?.id ?? "");
                                  setAssignNote("");
                                  setAssignError("");
                                }}
                                className="text-xs text-blue-500 hover:text-blue-700 px-1"
                              >
                                + vagt
                              </button>
                            )}
                            {cellA.length === 0 && deptTemplates.length === 0 && (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TEMPLATES TAB ── */}
      {tab === "templates" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Vagttyper{selectedDeptId && departments.find((d) => d.id === selectedDeptId) ? ` — ${departments.find((d) => d.id === selectedDeptId)?.name}` : ""}
            </h2>
            <button
              onClick={() => {
                setEditTplId(null);
                setTplForm({ name: "", startTime: "08:00", endTime: "16:00", color: "#3b82f6" });
                setShowTemplateForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + Ny vagttype
            </button>
          </div>

          {showTemplateForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {editTplId ? "Rediger vagttype" : "Ny vagttype"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Navn</label>
                  <input
                    value={tplForm.name}
                    onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                    placeholder="f.eks. Dagvagt"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Farve</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setTplForm({ ...tplForm, color: c })}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          tplForm.color === c ? "border-gray-800 scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Starttid</label>
                  <input
                    type="time"
                    value={tplForm.startTime}
                    onChange={(e) => setTplForm({ ...tplForm, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Sluttid</label>
                  <input
                    type="time"
                    value={tplForm.endTime}
                    onChange={(e) => setTplForm({ ...tplForm, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveTemplate}
                  disabled={tplLoading || !tplForm.name}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {tplLoading ? "Gemmer..." : editTplId ? "Gem ændringer" : "Opret"}
                </button>
                <button
                  onClick={() => { setShowTemplateForm(false); setEditTplId(null); }}
                  className="text-sm text-gray-500 px-3 py-2"
                >
                  Annuller
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {deptTemplates.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">
                Ingen vagttyper endnu. Opret den første.
              </div>
            )}
            {deptTemplates.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.startTime} – {t.endTime}
                    {isAdmin && (
                      <span className="ml-2 text-gray-400">{t.department.name}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEditTemplate(t)}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded"
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id, t.name)}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                  >
                    Slet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h2 className="font-bold text-gray-900">Tilføj vagt</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {employees.find((e) => e.id === assignModal.userId)?.name} ·{" "}
                {format(assignModal.date, "EEEE d. MMMM", { locale: da })}
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Vagttype</label>
              <div className="space-y-2">
                {deptTemplates.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      assignTemplateId === t.id
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={t.id}
                      checked={assignTemplateId === t.id}
                      onChange={() => setAssignTemplateId(t.id)}
                      className="accent-blue-600"
                    />
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.startTime}–{t.endTime}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Note (valgfri)</label>
              <input
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                placeholder="Fx overtid, kørsel..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {assignError && <p className="text-red-600 text-xs">{assignError}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={createAssignment}
                disabled={assignLoading || !assignTemplateId}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {assignLoading ? "Gemmer..." : "Tilføj vagt"}
              </button>
              <button
                onClick={() => setAssignModal(null)}
                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700"
              >
                Annuller
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
