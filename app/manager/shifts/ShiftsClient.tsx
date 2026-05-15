"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { PrintShiftPlan } from "@/components/PrintShiftPlan";
import { Btn } from "@/components/ui/Btn";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FieldInput } from "@/components/ui/FieldInput";
import { cn } from "@/lib/utils";
import { Printer, Plus, AlertTriangle, X } from "lucide-react";

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
  hasAbsenceConflict: boolean;
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
        className="p-2 rounded-md hover:bg-bg text-text-muted hover:text-text transition-colors"
        aria-label="Forrige uge"
      >
        ←
      </button>
      <span className="text-[13px] font-semibold text-text min-w-[180px] text-center">
        {format(weekStart, "d. MMM", { locale: da })} –{" "}
        {format(weekEnd, "d. MMM yyyy", { locale: da })}
      </span>
      <button
        onClick={() => onChange(addDays(weekStart, 7))}
        className="p-2 rounded-md hover:bg-bg text-text-muted hover:text-text transition-colors"
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
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTplId, setEditTplId] = useState<string | null>(null);

  const [assignModal, setAssignModal] = useState<{
    date: Date; userId: string;
  } | null>(null);
  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignConflict, setAssignConflict] = useState(false);

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
    setAssignConflict(false);
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
      if (data.hasAbsenceConflict) {
        setAssignConflict(true);
        setAssignLoading(false);
        loadAssignments();
        return;
      }
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

  async function confirmDeleteTemplate() {
    if (!deleteTemplateTarget) return;
    await fetch(`/api/shifts/templates/${deleteTemplateTarget.id}`, { method: "DELETE" });
    setDeleteTemplateTarget(null);
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
      {/* Screen-only content */}
      <div className="no-print">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-text">Vagtplan</h1>
          <p className="text-[13px] text-text-muted mt-0.5">Planlæg og se medarbejdervagter</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && departments.length > 1 && (
            <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}
              className="border border-border rounded-md px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary">
              <option value="">Alle afdelinger</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          {tab === "plan" && (
            <Btn variant="secondary" size="sm" onClick={() => window.print()} icon={<Printer size={14} />}>
              Udskriv
            </Btn>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg border border-border bg-bg mb-5 w-fit">
        {(["plan","templates"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors",
              tab === t ? "bg-surface text-text shadow-xs" : "text-text-muted hover:text-text")}>
            {t === "plan" ? "Ugeplan" : "Vagttyper"}
          </button>
        ))}
      </div>

      {/* ── PLAN TAB ── */}
      {tab === "plan" && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <WeekNav weekStart={weekStart} onChange={setWeekStart} />
            {deptEmployees.length === 0 && (
              <p className="text-[13px] text-text-subtle">Ingen medarbejdere i afdelingen</p>
            )}
          </div>

          {deptTemplates.length === 0 && (
            <div className="bg-warning-bg border border-[rgba(217,119,6,.2)] rounded-lg p-4 mb-4 text-[13px] text-warning-text">
              Opret vagttyper under fanen <strong>Vagttyper</strong> før du kan planlægge vagter.
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center justify-center gap-2.5 py-10 text-[13px] text-text-muted">
              <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Henter vagter…
            </div>
          )}

          {/* Empty week notice — shown when there are employees + templates but no assignments */}
          {!loading && deptEmployees.length > 0 && deptTemplates.length > 0 && assignments.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--c-primary-muted)", color: "var(--c-primary)" }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <p className="text-[14px] font-semibold text-text">Ingen vagter planlagt denne uge</p>
              <p className="text-[13px] text-text-muted max-w-[300px]">
                Klik <strong>+ vagt</strong> i en celle for at tilføje vagter til medarbejderne.
              </p>
            </div>
          )}

          {/* Desktop grid */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header row */}
              <div
                className="grid text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-1"
                style={{ gridTemplateColumns: `180px repeat(7, 1fr)` }}
              >
                <div className="px-3 py-2">Medarbejder</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`px-2 py-2 text-center rounded-lg ${
                      isSameDay(day, today) ? "bg-primary-light text-primary" : ""
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
                  className="grid border-t border-border"
                  style={{ gridTemplateColumns: `180px repeat(7, 1fr)` }}
                >
                  <div className="px-3 py-3 flex items-start">
                    <div>
                      <p className="text-[13px] font-semibold text-text leading-tight">{emp.name}</p>
                      {isAdmin && emp.department && (
                        <p className="text-[11px] text-text-subtle">{emp.department.name}</p>
                      )}
                    </div>
                  </div>
                  {weekDays.map((day) => {
                    const cellAssignments = getAssignmentsForCell(emp.id, day);
                    const isToday = isSameDay(day, today);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[72px] px-1 py-1 border-l border-border ${
                          isToday ? "bg-primary-muted/30" : ""
                        }`}
                      >
                        {cellAssignments.map((a) => (
                          <div
                            key={a.id}
                            className="group relative mb-1 rounded px-2 py-1.5 text-white text-[11px] leading-tight cursor-default shadow-xs"
                            style={{ backgroundColor: a.template.color }}
                          >
                            <div className="font-bold flex items-center gap-1">
                              {a.template.name}
                              {a.hasAbsenceConflict && (
                                <span title="Konflikt: godkendt fravær denne dag"
                                  className="absolute -top-[5px] -right-[5px] w-4 h-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
                                  <AlertTriangle size={8} className="text-white" />
                                </span>
                              )}
                            </div>
                            <div className="opacity-80">
                              {a.template.startTime}–{a.template.endTime}
                            </div>
                            {a.note && (
                              <div className="opacity-70 italic mt-0.5 truncate">{a.note}</div>
                            )}
                            <button
                              onClick={() => deleteAssignment(a.id)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white rounded-full text-[10px] items-center justify-center hidden group-hover:flex"
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
                              setAssignConflict(false);
                            }}
                            className="w-full text-[11px] text-text-subtle hover:text-primary hover:bg-primary-muted rounded-sm py-0.5 transition-colors mt-0.5 border border-dashed border-border"
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
                <div className="text-center py-12 text-text-subtle text-[13px]">
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
                <div key={emp.id} className="bg-surface border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-bg border-b border-border">
                    <p className="font-semibold text-text text-[13px]">{emp.name}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {weekDays.map((day) => {
                      const cellA = getAssignmentsForCell(emp.id, day);
                      const isToday = isSameDay(day, today);
                      return (
                        <div
                          key={day.toISOString()}
                          className={`px-4 py-2.5 flex items-center gap-3 ${isToday ? "bg-primary-muted/30" : ""}`}
                        >
                          <div className={`text-xs w-16 shrink-0 ${isToday ? "font-bold text-blue-700" : "text-text-muted"}`}>
                            {format(day, "EEE d.", { locale: da })}
                          </div>
                          <div className="flex-1 flex flex-wrap gap-1">
                            {cellA.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold"
                                style={{ backgroundColor: a.template.color }}
                              >
                                {a.hasAbsenceConflict && (
                                  <span title="Godkendt fravær denne dag">⚠️</span>
                                )}
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
                                  setAssignConflict(false);
                                }}
                                className="text-xs text-blue-500 hover:text-blue-700 px-1"
                              >
                                + vagt
                              </button>
                            )}
                            {cellA.length === 0 && deptTemplates.length === 0 && (
                              <span className="text-xs text-text-subtle">—</span>
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
            <h2 className="text-[13px] font-bold text-text">
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
            <div className="bg-bg border border-border rounded-lg p-4 mb-4 space-y-4">
              <h3 className="text-[13px] font-bold text-text">
                {editTplId ? "Rediger vagttype" : "Ny vagttype"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Navn</label>
                  <input
                    value={tplForm.name}
                    onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                    placeholder="f.eks. Dagvagt"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Farve</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setTplForm({ ...tplForm, color: c })}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          tplForm.color === c ? "border-text scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Starttid</label>
                  <input
                    type="time"
                    value={tplForm.startTime}
                    onChange={(e) => setTplForm({ ...tplForm, startTime: e.target.value })}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Sluttid</label>
                  <input
                    type="time"
                    value={tplForm.endTime}
                    onChange={(e) => setTplForm({ ...tplForm, endTime: e.target.value })}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]" />
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
                  className="text-sm text-text-muted px-3 py-2"
                >
                  Annuller
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {deptTemplates.length === 0 && (
              <div className="text-center py-10 text-text-subtle text-[13px]">
                Ingen vagttyper endnu. Opret den første.
              </div>
            )}
            {deptTemplates.map((t) => (
              <div
                key={t.id}
                className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <div className="flex-1">
                  <p className="font-semibold text-text text-[13px]">{t.name}</p>
                  <p className="text-[12px] text-text-muted">
                    {t.startTime} – {t.endTime}
                    {isAdmin && (
                      <span className="ml-2 text-text-subtle">{t.department.name}</span>
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
                    onClick={() => setDeleteTemplateTarget({ id: t.id, name: t.name })}
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
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[3px] z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4">
            <div>
              <h2 className="text-[17px] font-extrabold tracking-tight text-text">Tilføj vagt</h2>
              <p className="text-[13px] text-text-muted mt-0.5">
                {employees.find((e) => e.id === assignModal.userId)?.name} ·{" "}
                {format(assignModal.date, "EEEE d. MMMM", { locale: da })}
              </p>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Vagttype</label>
              <div className="space-y-2">
                {deptTemplates.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      assignTemplateId === t.id
                        ? "border-primary bg-primary-light"
                        : "border-border hover:bg-bg"
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={t.id}
                      checked={assignTemplateId === t.id}
                      onChange={() => setAssignTemplateId(t.id)}
                      className="accent-primary"
                    />
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <div>
                      <p className="text-[13px] font-semibold text-text">{t.name}</p>
                      <p className="text-[12px] text-text-muted">{t.startTime}–{t.endTime}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Note (valgfri)</label>
              <input
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                placeholder="Fx overtid, kørsel..."
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]"
              />
            </div>

            {assignError && <p className="text-red-600 text-xs">{assignError}</p>}
            {assignConflict && (
              <div className="bg-warning-bg border border-[rgba(217,119,6,.2)] rounded-lg p-3 text-[13px] text-warning-text">
                ⚠️ <strong>Advarsel:</strong> Medarbejderen har godkendt fravær denne dag. Vagten er gemt, men der er en konflikt.
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={createAssignment}
                disabled={assignLoading || !assignTemplateId}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {assignLoading ? "Gemmer..." : "Tilføj vagt"}
              </button>
              <button
                onClick={() => { setAssignModal(null); setAssignConflict(false); }}
                className="px-4 py-2.5 text-sm text-text-muted hover:text-text"
              >
                {assignConflict ? "Luk" : "Annuller"}
              </button>
            </div>
          </div>
        </div>
      )}
        {/* Conflict legend */}
        {assignments.some((a) => a.hasAbsenceConflict) && (
          <p className="mt-3 text-[12px] text-text-muted flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-amber-400 border-2 border-white inline-flex items-center justify-center shrink-0">
              <AlertTriangle size={8} className="text-white" />
            </span>
            Markerede vagter har konflikt med godkendt fravær.
          </p>
        )}
      </div>{/* end no-print */}

      <ConfirmDialog
        open={!!deleteTemplateTarget}
        title="Slet vagttype"
        message={`Er du sikker på at du vil slette vagttypen "${deleteTemplateTarget?.name}"? Alle tilknyttede vagter slettes også.`}
        confirmLabel="Slet vagttype"
        onConfirm={confirmDeleteTemplate}
        onClose={() => setDeleteTemplateTarget(null)}
      />

      {/* Print view – only visible when printing */}
      <PrintShiftPlan
        weekStart={weekStart}
        assignments={assignments}
        employees={employees}
        departments={departments}
        selectedDeptId={selectedDeptId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
