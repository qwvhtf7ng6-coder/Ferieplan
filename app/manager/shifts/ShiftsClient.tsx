"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
} from "date-fns";
import { da } from "date-fns/locale";
import { PrintShiftPlan } from "@/components/PrintShiftPlan";
import { Btn } from "@/components/ui/Btn";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";
import { Printer, AlertTriangle, RefreshCw, Calendar, Repeat, Plus } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Department { id: string; name: string; }
interface Employee { id: string; name: string; departmentId: string | null; department: { name: string } | null; }
interface DayTimeRule { start: string; end: string; }

interface ShiftTemplate {
  id: string; name: string; startTime: string; endTime: string; color: string;
  departmentId: string; department: { name: string }; dayTimeRules: string | null;
}

interface ShiftAssignment {
  id: string; date: string; note: string | null; hasAbsenceConflict: boolean;
  user: { id: string; name: string };
  template: ShiftTemplate & { department: { name: string } };
}

interface ShiftPattern {
  id: string; name: string; departmentId: string; templateId: string; userId: string;
  startDate: string; endDate: string; recurrenceType: string; intervalWeeks: number;
  weekdayRules: string; note: string | null; active: boolean;
  template: { id: string; name: string; color: string; startTime: string; endTime: string };
  user: { id: string; name: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

const WEEKDAYS = [
  { label: "Man", value: 1 }, { label: "Tir", value: 2 }, { label: "Ons", value: 3 },
  { label: "Tor", value: 4 }, { label: "Fre", value: 5 }, { label: "Lør", value: 6 }, { label: "Søn", value: 0 },
];

const WEEKDAY_NAMES: Record<number, string> = {
  0: "Søndag", 1: "Mandag", 2: "Tirsdag", 3: "Onsdag", 4: "Torsdag", 5: "Fredag", 6: "Lørdag",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveTemplateTime(
  template: { startTime: string; endTime: string; dayTimeRules: string | null },
  date: Date
): { startTime: string; endTime: string } {
  if (!template.dayTimeRules) return { startTime: template.startTime, endTime: template.endTime };
  try {
    const rules: Record<string, DayTimeRule> = JSON.parse(template.dayTimeRules);
    const dow = date.getDay().toString();
    if (rules[dow]) return { startTime: rules[dow].start, endTime: rules[dow].end };
  } catch {}
  return { startTime: template.startTime, endTime: template.endTime };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WeekNav({ weekStart, onChange }: { weekStart: Date; onChange: (d: Date) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(addDays(weekStart, -7))}
        className="p-2 rounded-md hover:bg-bg text-text-muted hover:text-text transition-colors" aria-label="Forrige uge">←</button>
      <span className="text-[13px] font-semibold text-text min-w-[180px] text-center">
        {format(weekStart, "d. MMM", { locale: da })} – {format(addDays(weekStart, 6), "d. MMM yyyy", { locale: da })}
      </span>
      <button onClick={() => onChange(addDays(weekStart, 7))}
        className="p-2 rounded-md hover:bg-bg text-text-muted hover:text-text transition-colors" aria-label="Næste uge">→</button>
      <button onClick={() => onChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}
        className="ml-1 text-xs px-3 py-1.5 bg-primary-light text-primary rounded-lg hover:opacity-80 font-semibold">I dag</button>
    </div>
  );
}

function DayTimeRulesEditor({ value, onChange, defaultStart, defaultEnd }: {
  value: Record<string, DayTimeRule>;
  onChange: (v: Record<string, DayTimeRule>) => void;
  defaultStart: string; defaultEnd: string;
}) {
  return (
    <div className="space-y-2">
      {WEEKDAYS.map(({ label, value: dow }) => {
        const rule = value[dow.toString()];
        const enabled = !!rule;
        return (
          <div key={dow} className="flex items-center gap-2">
            <button type="button"
              onClick={() => {
                const next = { ...value };
                if (enabled) delete next[dow.toString()];
                else next[dow.toString()] = { start: defaultStart, end: defaultEnd };
                onChange(next);
              }}
              className={cn("w-10 text-[11px] font-bold rounded-md py-1.5 transition-colors border",
                enabled ? "bg-primary text-white border-primary" : "bg-surface text-text-muted border-border")}>
              {label}
            </button>
            {enabled ? (
              <>
                <input type="time" value={rule.start}
                  onChange={(e) => onChange({ ...value, [dow.toString()]: { ...rule, start: e.target.value } })}
                  className="border border-border rounded-md px-2 py-1 text-xs bg-surface text-text focus:outline-none focus:border-primary w-24" />
                <span className="text-text-muted text-xs">–</span>
                <input type="time" value={rule.end}
                  onChange={(e) => onChange({ ...value, [dow.toString()]: { ...rule, end: e.target.value } })}
                  className="border border-border rounded-md px-2 py-1 text-xs bg-surface text-text focus:outline-none focus:border-primary w-24" />
              </>
            ) : (
              <span className="text-[12px] text-text-subtle italic">Standard ({defaultStart}–{defaultEnd})</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Pattern form types & defaults ────────────────────────────────────────────

interface PatternFormData {
  name: string; userId: string; templateId: string;
  recurrenceType: "weekly" | "interval" | "nth_weekday";
  intervalWeeks: number;
  weeklyDays: number[];
  intervalRules: { weekIndex: number; weekdays: number[] }[];
  nthWeekday: number;      // ugedag (0=søn...6=lør)
  nthEvery: number;        // hver N'te forekomst
  nthFirstOccurrence: string; // dato for første ønskede forekomst (YYYY-MM-DD)
  rangeMode: "month" | "months" | "custom";
  monthsCount: number;
  startDate: string; endDate: string; note: string;
}

function defaultPatternForm(): PatternFormData {
  const today = new Date();
  return {
    name: "", userId: "", templateId: "",
    recurrenceType: "weekly", intervalWeeks: 2,
    weeklyDays: [1],
    intervalRules: [{ weekIndex: 0, weekdays: [1] }, { weekIndex: 1, weekdays: [3] }],
    nthWeekday: 5,
    nthEvery: 2,
    nthFirstOccurrence: "",  // sættes af brugeren
    rangeMode: "month", monthsCount: 1,
    startDate: format(startOfMonth(today), "yyyy-MM-dd"),
    endDate: format(endOfMonth(today), "yyyy-MM-dd"),
    note: "",
  };
}

// ─── PatternForm component ────────────────────────────────────────────────────

function PatternForm({ form, onChange, employees, templates, loading, error, onSubmit, onCancel, submitLabel }: {
  form: PatternFormData; onChange: (f: PatternFormData) => void;
  employees: Employee[]; templates: ShiftTemplate[];
  loading: boolean; error: string; onSubmit: () => void; onCancel: () => void; submitLabel: string;
}) {
  const set = (patch: Partial<PatternFormData>) => onChange({ ...form, ...patch });

  function applyRangeMode(mode: PatternFormData["rangeMode"], months: number) {
    const today = new Date();
    if (mode === "month") {
      set({ rangeMode: mode, monthsCount: months, startDate: format(startOfMonth(today), "yyyy-MM-dd"), endDate: format(endOfMonth(today), "yyyy-MM-dd") });
    } else if (mode === "months") {
      set({ rangeMode: mode, monthsCount: months, startDate: format(startOfMonth(today), "yyyy-MM-dd"), endDate: format(endOfMonth(addMonths(today, months - 1)), "yyyy-MM-dd") });
    } else {
      set({ rangeMode: mode, monthsCount: months });
    }
  }

  function setIntervalWeeks(n: number) {
    const weeks = Math.max(1, Math.min(8, n));
    const newRules: { weekIndex: number; weekdays: number[] }[] = [];
    for (let i = 0; i < weeks; i++) {
      newRules.push(form.intervalRules.find((r) => r.weekIndex === i) || { weekIndex: i, weekdays: [] });
    }
    set({ intervalWeeks: weeks, intervalRules: newRules });
  }

  function toggleIntervalWeekday(weekIndex: number, dow: number) {
    const rules = form.intervalRules.map((r) => {
      if (r.weekIndex !== weekIndex) return r;
      const days = r.weekdays.includes(dow) ? r.weekdays.filter((d) => d !== dow) : [...r.weekdays, dow];
      return { ...r, weekdays: days };
    });
    set({ intervalRules: rules });
  }

  return (
    <div className="space-y-5">
      {/* Navn + medarbejder + vagttype + note */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1">Navn på mønster</label>
          <input value={form.name} onChange={(e) => set({ name: e.target.value })}
            placeholder="f.eks. Andreas – skifteholdsplan"
            className="w-full border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1">Medarbejder</label>
          <select value={form.userId} onChange={(e) => set({ userId: e.target.value })}
            className="w-full border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary">
            <option value="">Vælg medarbejder…</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1">Vagttype</label>
          <select value={form.templateId} onChange={(e) => set({ templateId: e.target.value })}
            className="w-full border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary">
            <option value="">Vælg vagttype…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.startTime}–{t.endTime})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1">Note (valgfri)</label>
          <input value={form.note} onChange={(e) => set({ note: e.target.value })}
            placeholder="Intern note…"
            className="w-full border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]" />
        </div>
      </div>

      {/* Gentagelsestype */}
      <div>
        <SectionLabel>Gentagelsestype</SectionLabel>
        <div className="flex gap-2 mt-2 flex-wrap">
          {(["weekly", "nth_weekday", "interval"] as const).map((t) => (
            <button key={t} type="button" onClick={() => {
              set({ recurrenceType: t });
              // nth_weekday kræver præcis periodestyring — skift automatisk til custom
              if (t === "nth_weekday" && form.rangeMode !== "custom") {
                set({ recurrenceType: t, rangeMode: "custom" });
              }
            }}
              className={cn("px-4 py-2 rounded-[10px] text-[13px] font-semibold border transition-colors",
                form.recurrenceType === t ? "bg-primary text-white border-primary" : "bg-surface text-text-muted border-border hover:border-primary hover:text-text")}>
              {t === "weekly" ? "Fast ugedag" : t === "nth_weekday" ? "Hver N. ugedag" : "Interval (skiftehold)"}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-text-subtle">
          {form.recurrenceType === "weekly"
            ? "Samme ugedage gentages hver uge."
            : form.recurrenceType === "nth_weekday"
            ? "Vælg en ugedag og angiv hvor ofte den gentages — f.eks. hver 4. fredag."
            : "Cyklus af uger med forskellige dage — velegnet til skiftehold."}
        </p>
      </div>

      {/* Fast ugedag */}
      {form.recurrenceType === "weekly" && (
        <div>
          <SectionLabel>Ugedage</SectionLabel>
          <div className="flex gap-2 mt-2 flex-wrap">
            {WEEKDAYS.map(({ label, value: dow }) => (
              <button key={dow} type="button"
                onClick={() => {
                  const days = form.weeklyDays.includes(dow) ? form.weeklyDays.filter((d) => d !== dow) : [...form.weeklyDays, dow];
                  set({ weeklyDays: days });
                }}
                className={cn("w-12 py-2 rounded-[10px] text-[12px] font-bold border transition-colors",
                  form.weeklyDays.includes(dow) ? "bg-primary text-white border-primary" : "bg-surface text-text-muted border-border hover:border-primary")}>
                {label}
              </button>
            ))}
          </div>
          {form.weeklyDays.length > 0 && (
            <p className="mt-2 text-[12px] text-text-subtle">
              Vagter hver uge på:{" "}
              {form.weeklyDays.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).map((d) => WEEKDAY_NAMES[d]).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Hver N. ugedag */}
      {form.recurrenceType === "nth_weekday" && (
        <div className="space-y-3">
          <SectionLabel>Opsætning</SectionLabel>
          <div className="bg-bg rounded-[10px] border border-border p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-2">Ugedag</label>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAYS.map(({ label, value: dow }) => (
                  <button key={dow} type="button"
                    onClick={() => set({ nthWeekday: dow, nthFirstOccurrence: "" })}
                    className={cn("w-12 py-2 rounded-[10px] text-[12px] font-bold border transition-colors",
                      form.nthWeekday === dow ? "bg-primary text-white border-primary" : "bg-surface text-text-muted border-border hover:border-primary")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-2">
                Hver <span className="text-primary">{form.nthEvery}.</span> {WEEKDAY_NAMES[form.nthWeekday].toLowerCase()}
              </label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => set({ nthEvery: Math.max(2, form.nthEvery - 1) })}
                  className="w-8 h-8 rounded-md border border-border bg-surface text-text-muted hover:text-text flex items-center justify-center text-sm font-bold">−</button>
                <span className="text-[18px] font-extrabold text-primary w-8 text-center">{form.nthEvery}</span>
                <button type="button" onClick={() => set({ nthEvery: Math.min(8, form.nthEvery + 1) })}
                  className="w-8 h-8 rounded-md border border-border bg-surface text-text-muted hover:text-text flex items-center justify-center text-sm font-bold">+</button>
                <span className="text-[13px] text-text-muted ml-1">uger imellem</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Første {WEEKDAY_NAMES[form.nthWeekday].toLowerCase()} der tælles fra
              </label>
              <p className="text-[12px] text-text-subtle mb-2">
                Vælg den konkrete dato for den første vagt i cyklussen. Kun {WEEKDAY_NAMES[form.nthWeekday].toLowerCase()}e er gyldige.
              </p>
              <input
                type="date"
                value={form.nthFirstOccurrence}
                onChange={(e) => {
                  const d = e.target.value;
                  // Validér at datoen matcher den valgte ugedag
                  if (d) {
                    const dow = new Date(d + "T12:00:00").getDay();
                    if (dow !== form.nthWeekday) return; // ignorer ugyldige datoer
                  }
                  set({ nthFirstOccurrence: d });
                }}
                className="border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary w-48"
              />
              {form.nthFirstOccurrence && (
                <p className="mt-1.5 text-[12px] text-primary font-semibold">
                  ✓ Cyklus starter fra{" "}
                  {format(parseISO(form.nthFirstOccurrence), "EEEE d. MMMM yyyy", { locale: da })}
                </p>
              )}
              {!form.nthFirstOccurrence && (
                <p className="mt-1.5 text-[12px] text-warning-text">
                  Vælg en dato — kun {WEEKDAY_NAMES[form.nthWeekday].toLowerCase()}e kan vælges
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interval cyklus */}
      {form.recurrenceType === "interval" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <SectionLabel>Antal uger i cyklus</SectionLabel>
            <div className="flex items-center gap-2 ml-2">
              <button type="button" onClick={() => setIntervalWeeks(form.intervalWeeks - 1)}
                className="w-7 h-7 rounded-md border border-border bg-surface text-text-muted hover:text-text flex items-center justify-center text-sm">−</button>
              <span className="text-[14px] font-bold text-text w-6 text-center">{form.intervalWeeks}</span>
              <button type="button" onClick={() => setIntervalWeeks(form.intervalWeeks + 1)}
                className="w-7 h-7 rounded-md border border-border bg-surface text-text-muted hover:text-text flex items-center justify-center text-sm">+</button>
            </div>
          </div>
          <div className="space-y-2">
            {form.intervalRules.map((rule, i) => (
              <div key={i} className="bg-bg rounded-[10px] border border-border p-3">
                <p className="text-[12px] font-bold text-text-muted mb-2">Uge {i + 1} i cyklus</p>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEKDAYS.map(({ label, value: dow }) => (
                    <button key={dow} type="button" onClick={() => toggleIntervalWeekday(i, dow)}
                      className={cn("w-11 py-1.5 rounded-[8px] text-[11px] font-bold border transition-colors",
                        rule.weekdays.includes(dow) ? "bg-primary text-white border-primary" : "bg-surface text-text-muted border-border hover:border-primary")}>
                      {label}
                    </button>
                  ))}
                </div>
                {rule.weekdays.length === 0 && (
                  <p className="text-[11px] text-text-subtle mt-1 italic">Ingen vagter i denne uge</p>
                )}
                {rule.weekdays.length > 0 && (
                  <p className="text-[11px] text-text-subtle mt-1">
                    {rule.weekdays.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).map((d) => WEEKDAY_NAMES[d]).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-[12px] text-text-subtle">Cyklussen gentages automatisk fra startdatoen og frem.</p>
        </div>
      )}

      {/* Periode */}
      <div>
        <SectionLabel>Periode</SectionLabel>
        <div className="flex gap-2 mt-2 flex-wrap">
          {(["month", "months", "custom"] as const).map((m) => (
            <button key={m} type="button" onClick={() => applyRangeMode(m, form.monthsCount)}
              className={cn("px-3 py-1.5 rounded-[10px] text-[12px] font-semibold border transition-colors",
                form.rangeMode === m ? "bg-primary text-white border-primary" : "bg-surface text-text-muted border-border hover:border-primary hover:text-text")}>
              {m === "month" ? "Denne måned" : m === "months" ? "Flere måneder" : "Brugerdefineret"}
            </button>
          ))}
        </div>

        {form.rangeMode === "months" && (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-text-muted">Antal måneder:</label>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => applyRangeMode("months", Math.max(1, form.monthsCount - 1))}
                className="w-7 h-7 rounded-md border border-border bg-surface text-text-muted hover:text-text flex items-center justify-center text-sm">−</button>
              <span className="text-[13px] font-bold text-text w-6 text-center">{form.monthsCount}</span>
              <button type="button" onClick={() => applyRangeMode("months", Math.min(24, form.monthsCount + 1))}
                className="w-7 h-7 rounded-md border border-border bg-surface text-text-muted hover:text-text flex items-center justify-center text-sm">+</button>
            </div>
          </div>
        )}

        {form.rangeMode === "custom" && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Fra</label>
              <input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })}
                className="w-full border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Til</label>
              <input type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })}
                className="w-full border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary" />
            </div>
          </div>
        )}

        {form.startDate && form.endDate && (
          <p className="mt-2 text-[12px] text-text-subtle">
            {format(parseISO(form.startDate), "d. MMMM yyyy", { locale: da })} –{" "}
            {format(parseISO(form.endDate), "d. MMMM yyyy", { locale: da })}
          </p>
        )}
      </div>

      {error && (
        <p className="text-[13px] text-danger-text bg-danger-bg border border-[rgba(220,38,38,.2)] rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onSubmit}
          disabled={loading || !form.name || !form.userId || !form.templateId || (form.recurrenceType === "nth_weekday" && !form.nthFirstOccurrence)}
          className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors">
          {loading ? "Gemmer og genererer vagter…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 text-sm text-text-muted hover:text-text transition-colors">
          Annuller
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ShiftsClient({
  departments, employees, isAdmin, managerDepartmentId, readOnly = false,
}: {
  departments: Department[]; employees: Employee[]; isAdmin: boolean; managerDepartmentId: string | null; readOnly?: boolean;
}) {
  const [tab, setTab] = useState<"plan" | "templates" | "patterns">("plan");
  const [selectedDeptId, setSelectedDeptId] = useState(isAdmin ? (departments[0]?.id ?? "") : (managerDepartmentId ?? ""));
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [loading, setLoading] = useState(false);

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [tplForm, setTplForm] = useState({ name: "", startTime: "08:00", endTime: "16:00", color: "#3b82f6", dayTimeRules: {} as Record<string, DayTimeRule> });
  const [showDayTimeRules, setShowDayTimeRules] = useState(false);
  const [tplLoading, setTplLoading] = useState(false);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTplId, setEditTplId] = useState<string | null>(null);

  // Assign modal
  const [assignModal, setAssignModal] = useState<{ date: Date; userId: string } | null>(null);
  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignConflict, setAssignConflict] = useState(false);

  // Pattern
  const [showPatternForm, setShowPatternForm] = useState(false);
  const [patternForm, setPatternForm] = useState<PatternFormData>(defaultPatternForm());
  const [patternLoading, setPatternLoading] = useState(false);
  const [patternError, setPatternError] = useState("");
  const [patternSuccess, setPatternSuccess] = useState<string | null>(null); // fx "7 vagter genereret"
  const [editPatternId, setEditPatternId] = useState<string | null>(null);
  const [deletePatternTarget, setDeletePatternTarget] = useState<{ id: string; name: string } | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenerateSuccess, setRegenerateSuccess] = useState<Record<string, number>>({}); // patternId → antal

  const deptEmployees = employees.filter((e) => !selectedDeptId || e.departmentId === selectedDeptId);
  const deptTemplates = templates.filter((t) => !selectedDeptId || t.departmentId === selectedDeptId);
  const deptPatterns = patterns.filter((p) => !selectedDeptId || p.departmentId === selectedDeptId);

  const loadTemplates = useCallback(async () => {
    const qs = selectedDeptId ? `?departmentId=${selectedDeptId}` : "";
    const res = await fetch(`/api/shifts/templates${qs}`);
    if (res.ok) setTemplates(await res.json());
  }, [selectedDeptId]);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ weekStart: format(weekStart, "yyyy-MM-dd"), ...(selectedDeptId ? { departmentId: selectedDeptId } : {}) });
    const res = await fetch(`/api/shifts/assignments?${qs}`);
    if (res.ok) setAssignments(await res.json());
    setLoading(false);
  }, [weekStart, selectedDeptId]);

  const loadPatterns = useCallback(async () => {
    const qs = selectedDeptId ? `?departmentId=${selectedDeptId}` : "";
    const res = await fetch(`/api/shifts/patterns${qs}`);
    if (res.ok) setPatterns(await res.json());
  }, [selectedDeptId]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { loadAssignments(); }, [loadAssignments]);
  useEffect(() => { loadPatterns(); }, [loadPatterns]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  function getAssignmentsForCell(userId: string, date: Date) {
    return assignments.filter((a) => a.user.id === userId && isSameDay(parseISO(a.date), date));
  }

  async function deleteAssignment(id: string) {
    await fetch(`/api/shifts/assignments/${id}`, { method: "DELETE" });
    loadAssignments();
  }

  async function createAssignment() {
    if (!assignModal || !assignTemplateId) return;
    setAssignLoading(true); setAssignError(""); setAssignConflict(false);
    const res = await fetch("/api/shifts/assignments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: assignModal.userId, templateId: assignTemplateId, date: format(assignModal.date, "yyyy-MM-dd"), note: assignNote || null }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.hasAbsenceConflict) { setAssignConflict(true); setAssignLoading(false); loadAssignments(); return; }
      setAssignModal(null); setAssignTemplateId(""); setAssignNote(""); loadAssignments();
    } else { setAssignError(data.error || "Fejl"); }
    setAssignLoading(false);
  }

  async function saveTemplate() {
    setTplLoading(true);
    const method = editTplId ? "PATCH" : "POST";
    const url = editTplId ? `/api/shifts/templates/${editTplId}` : "/api/shifts/templates";
    const dayTimeRulesPayload = Object.keys(tplForm.dayTimeRules).length > 0 ? tplForm.dayTimeRules : null;
    const body = editTplId ? { ...tplForm, dayTimeRules: dayTimeRulesPayload } : { ...tplForm, departmentId: selectedDeptId, dayTimeRules: dayTimeRulesPayload };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setShowTemplateForm(false); setEditTplId(null);
      setTplForm({ name: "", startTime: "08:00", endTime: "16:00", color: "#3b82f6", dayTimeRules: {} });
      setShowDayTimeRules(false); loadTemplates();
    }
    setTplLoading(false);
  }

  async function confirmDeleteTemplate() {
    if (!deleteTemplateTarget) return;
    await fetch(`/api/shifts/templates/${deleteTemplateTarget.id}`, { method: "DELETE" });
    setDeleteTemplateTarget(null); loadTemplates();
  }

  function startEditTemplate(t: ShiftTemplate) {
    setEditTplId(t.id);
    let parsedRules: Record<string, DayTimeRule> = {};
    if (t.dayTimeRules) { try { parsedRules = JSON.parse(t.dayTimeRules); } catch {} }
    setTplForm({ name: t.name, startTime: t.startTime, endTime: t.endTime, color: t.color, dayTimeRules: parsedRules });
    setShowDayTimeRules(Object.keys(parsedRules).length > 0);
    setShowTemplateForm(true);
  }

  async function createPattern() {
    setPatternLoading(true); setPatternError(""); setPatternSuccess(null);
    let weekdayRules: unknown;
    if (patternForm.recurrenceType === "weekly") {
      weekdayRules = patternForm.weeklyDays;
    } else if (patternForm.recurrenceType === "nth_weekday") {
      if (!patternForm.nthFirstOccurrence) {
        setPatternError(`Vælg den første ${WEEKDAY_NAMES[patternForm.nthWeekday].toLowerCase()} cyklussen skal starte fra.`);
        setPatternLoading(false);
        return;
      }
      // Validér at firstOccurrence er inden for perioden
      const anchor = parseISO(patternForm.nthFirstOccurrence);
      const start = parseISO(patternForm.startDate);
      const end = parseISO(patternForm.endDate);
      if (anchor < start || anchor > end) {
        setPatternError(`Den første ${WEEKDAY_NAMES[patternForm.nthWeekday].toLowerCase()} (${format(anchor, "d. MMM yyyy", { locale: da })}) skal ligge inden for perioden (${format(start, "d. MMM", { locale: da })} – ${format(end, "d. MMM yyyy", { locale: da })}).`);
        setPatternLoading(false);
        return;
      }
      weekdayRules = { weekday: patternForm.nthWeekday, every: patternForm.nthEvery, firstOccurrence: patternForm.nthFirstOccurrence };
    } else {
      weekdayRules = patternForm.intervalRules;
    }
    const res = await fetch("/api/shifts/patterns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: patternForm.name, departmentId: selectedDeptId, templateId: patternForm.templateId,
        userId: patternForm.userId, startDate: patternForm.startDate, endDate: patternForm.endDate,
        recurrenceType: patternForm.recurrenceType, intervalWeeks: patternForm.intervalWeeks,
        weekdayRules, note: patternForm.note || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setShowPatternForm(false);
      setEditPatternId(null);
      setPatternForm(defaultPatternForm());
      setPatternSuccess(`✓ Mønster oprettet — ${data.generated ?? 0} vagt${(data.generated ?? 0) !== 1 ? "er" : ""} genereret`);
      loadPatterns(); loadAssignments();
    } else {
      const d = await res.json(); setPatternError(d.error || "Fejl ved oprettelse");
    }
    setPatternLoading(false);
  }

  async function togglePatternActive(p: ShiftPattern) {
    await fetch(`/api/shifts/patterns/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !p.active }) });
    loadPatterns();
  }

  async function confirmDeletePattern() {
    if (!deletePatternTarget) return;
    await fetch(`/api/shifts/patterns/${deletePatternTarget.id}`, { method: "DELETE" });
    setDeletePatternTarget(null); loadPatterns();
  }

  async function regeneratePattern(p: ShiftPattern) {
    setRegeneratingId(p.id);
    const res = await fetch(`/api/shifts/patterns/${p.id}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setRegenerateSuccess((prev) => ({ ...prev, [p.id]: data.generated ?? 0 }));
      setTimeout(() => setRegenerateSuccess((prev) => { const n = { ...prev }; delete n[p.id]; return n; }), 4000);
    }
    setRegeneratingId(null); loadAssignments();
  }

  function startEditPattern(p: ShiftPattern) {
    const rules = JSON.parse(p.weekdayRules);
    let form: PatternFormData = {
      ...defaultPatternForm(),
      name: p.name,
      userId: p.userId,
      templateId: p.templateId,
      recurrenceType: p.recurrenceType as PatternFormData["recurrenceType"],
      intervalWeeks: p.intervalWeeks,
      note: p.note || "",
      rangeMode: "custom",
      startDate: format(parseISO(p.startDate), "yyyy-MM-dd"),
      endDate: format(parseISO(p.endDate), "yyyy-MM-dd"),
    };
    if (p.recurrenceType === "weekly") {
      form.weeklyDays = rules as number[];
    } else if (p.recurrenceType === "nth_weekday") {
      form.nthWeekday = rules.weekday;
      form.nthEvery = rules.every;
      form.nthFirstOccurrence = rules.firstOccurrence || "";
    } else if (p.recurrenceType === "interval") {
      form.intervalRules = rules;
      form.intervalWeeks = p.intervalWeeks;
    }
    setPatternForm(form);
    setEditPatternId(p.id);
    setPatternError("");
    setPatternSuccess(null);
    setShowPatternForm(true);
    // Scroll til formularen
    setTimeout(() => document.getElementById("pattern-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function updatePattern() {
    if (!editPatternId) return;
    setPatternLoading(true); setPatternError(""); setPatternSuccess(null);
    let weekdayRules: unknown;
    if (patternForm.recurrenceType === "weekly") {
      weekdayRules = patternForm.weeklyDays;
    } else if (patternForm.recurrenceType === "nth_weekday") {
      if (!patternForm.nthFirstOccurrence) {
        setPatternError(`Vælg den første ${WEEKDAY_NAMES[patternForm.nthWeekday].toLowerCase()} cyklussen skal starte fra.`);
        setPatternLoading(false); return;
      }
      const anchor = parseISO(patternForm.nthFirstOccurrence);
      const start = parseISO(patternForm.startDate);
      const end = parseISO(patternForm.endDate);
      if (anchor < start || anchor > end) {
        setPatternError(`Den første ${WEEKDAY_NAMES[patternForm.nthWeekday].toLowerCase()} skal ligge inden for perioden.`);
        setPatternLoading(false); return;
      }
      weekdayRules = { weekday: patternForm.nthWeekday, every: patternForm.nthEvery, firstOccurrence: patternForm.nthFirstOccurrence };
    } else {
      weekdayRules = patternForm.intervalRules;
    }
    // Opdater mønster og regenerer vagter
    const patchRes = await fetch(`/api/shifts/patterns/${editPatternId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: patternForm.name,
        note: patternForm.note || null,
        startDate: patternForm.startDate,
        endDate: patternForm.endDate,
        recurrenceType: patternForm.recurrenceType,
        intervalWeeks: patternForm.intervalWeeks,
        weekdayRules,
      }),
    });
    if (!patchRes.ok) {
      const d = await patchRes.json(); setPatternError(d.error || "Fejl ved opdatering");
      setPatternLoading(false); return;
    }
    // Regenerer vagter
    const regenRes = await fetch(`/api/shifts/patterns/${editPatternId}`, { method: "POST" });
    const regenData = regenRes.ok ? await regenRes.json() : { generated: 0 };
    setShowPatternForm(false);
    setEditPatternId(null);
    setPatternForm(defaultPatternForm());
    setPatternSuccess(`✓ Mønster opdateret — ${regenData.generated ?? 0} vagt${(regenData.generated ?? 0) !== 1 ? "er" : ""} regenereret`);
    loadPatterns(); loadAssignments();
    setPatternLoading(false);
  }
    try {
      const rules = JSON.parse(p.weekdayRules);
      if (p.recurrenceType === "weekly") {
        const days = (rules as number[]).sort((a: number, b: number) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
          .map((d: number) => WEEKDAYS.find((w) => w.value === d)?.label ?? d).join(", ");
        return `Hver uge: ${days}`;
      } else if (p.recurrenceType === "nth_weekday") {
        const { weekday, every, firstOccurrence } = rules as { weekday: number; every: number; firstOccurrence: string };
        const anchorStr = firstOccurrence
          ? ` fra ${format(parseISO(firstOccurrence), "d. MMM yyyy", { locale: da })}`
          : "";
        return `Hver ${every}. ${WEEKDAY_NAMES[weekday].toLowerCase()}${anchorStr}`;
      } else {
        return (rules as { weekIndex: number; weekdays: number[] }[]).map((r) => {
          const days = r.weekdays.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
            .map((d) => WEEKDAYS.find((w) => w.value === d)?.label ?? d).join(", ");
          return `Uge ${r.weekIndex + 1}: ${days || "–"}`;
        }).join(" · ");
      }
    } catch { return ""; }
  }

  return (
    <div>
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
              <Btn variant="secondary" size="sm" onClick={() => window.print()} icon={<Printer size={14} />}>Udskriv</Btn>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg border border-border bg-bg mb-5 w-fit">
          {(["plan", "templates", "patterns"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors flex items-center gap-1.5",
                tab === t ? "bg-surface text-text shadow-xs" : "text-text-muted hover:text-text")}>
              {t === "plan" && <Calendar size={13} />}
              {t === "templates" && <Plus size={13} />}
              {t === "patterns" && <Repeat size={13} />}
              {t === "plan" ? "Ugeplan" : t === "templates" ? "Vagttyper" : "Gentagelser"}
            </button>
          ))}
        </div>

        {/* ── PLAN TAB ── */}
        {tab === "plan" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <WeekNav weekStart={weekStart} onChange={setWeekStart} />
            </div>
            {deptTemplates.length === 0 && (
              <div className="bg-warning-bg border border-[rgba(217,119,6,.2)] rounded-lg p-4 mb-4 text-[13px] text-warning-text">
                Opret vagttyper under fanen <strong>Vagttyper</strong> før du kan planlægge vagter.
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center gap-2.5 py-10 text-[13px] text-text-muted">
                <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Henter vagter…
              </div>
            )}
            {!loading && deptEmployees.length > 0 && deptTemplates.length > 0 && assignments.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--c-primary-muted)", color: "var(--c-primary)" }}>
                  <Calendar size={20} />
                </div>
                <p className="text-[14px] font-semibold text-text">Ingen vagter planlagt denne uge</p>
                <p className="text-[13px] text-text-muted max-w-[300px]">
                  Klik <strong>+ vagt</strong> i en celle, eller opret et mønster under <strong>Gentagelser</strong>.
                </p>
              </div>
            )}
            {/* Desktop grid */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-1"
                  style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}>
                  <div className="px-3 py-2">Medarbejder</div>
                  {weekDays.map((day) => (
                    <div key={day.toISOString()}
                      className={`px-2 py-2 text-center rounded-lg ${isSameDay(day, today) ? "bg-primary-light text-primary" : ""}`}>
                      <div>{format(day, "EEE", { locale: da })}</div>
                      <div className="text-base font-bold mt-0.5">{format(day, "d")}</div>
                    </div>
                  ))}
                </div>
                {deptEmployees.map((emp) => (
                  <div key={emp.id} className="grid border-t border-border" style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}>
                    <div className="px-3 py-3 flex items-start">
                      <div>
                        <p className="text-[13px] font-semibold text-text leading-tight">{emp.name}</p>
                        {isAdmin && emp.department && <p className="text-[11px] text-text-subtle">{emp.department.name}</p>}
                      </div>
                    </div>
                    {weekDays.map((day) => {
                      const cellAssignments = getAssignmentsForCell(emp.id, day);
                      const isToday = isSameDay(day, today);
                      return (
                        <div key={day.toISOString()} className={`min-h-[72px] px-1 py-1 border-l border-border ${isToday ? "bg-primary-muted/30" : ""}`}>
                          {cellAssignments.map((a) => {
                            const resolved = resolveTemplateTime(a.template, parseISO(a.date));
                            return (
                              <div key={a.id} className="group relative mb-1 rounded px-2 py-1.5 text-white text-[11px] leading-tight cursor-default shadow-xs"
                                style={{ backgroundColor: a.template.color }}>
                                <div className="font-bold flex items-center gap-1">
                                  {a.template.name}
                                  {a.hasAbsenceConflict && (
                                    <span title="Konflikt: godkendt fravær denne dag"
                                      className="absolute -top-[5px] -right-[5px] w-4 h-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
                                      <AlertTriangle size={8} className="text-white" />
                                    </span>
                                  )}
                                </div>
                                <div className="opacity-80">{resolved.startTime}–{resolved.endTime}</div>
                                {a.note && <div className="opacity-70 italic mt-0.5 truncate">{a.note}</div>}
                                <button onClick={() => deleteAssignment(a.id)}
                                  className={cn("absolute -top-1 -right-1 w-4 h-4 bg-danger text-white rounded-full text-[10px] items-center justify-center hidden group-hover:flex", readOnly && "!hidden")}
                                  title="Fjern vagt">×</button>
                              </div>
                            );
                          })}
                          {deptTemplates.length > 0 && !readOnly && (
                            <button
                              onClick={() => { setAssignModal({ date: day, userId: emp.id }); setAssignTemplateId(deptTemplates[0]?.id ?? ""); setAssignNote(""); setAssignError(""); setAssignConflict(false); }}
                              className="w-full text-[11px] text-text-subtle hover:text-primary hover:bg-primary-muted rounded-sm py-0.5 transition-colors mt-0.5 border border-dashed border-border"
                              title="Tilføj vagt">+ vagt</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {deptEmployees.length === 0 && (
                  <div className="text-center py-12 text-text-subtle text-[13px]">Ingen medarbejdere at vise</div>
                )}
              </div>
            </div>
            {/* Mobile */}
            <div className="md:hidden space-y-4">
              {deptEmployees.map((emp) => (
                <div key={emp.id} className="bg-surface border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-bg border-b border-border">
                    <p className="font-semibold text-text text-[13px]">{emp.name}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {weekDays.map((day) => {
                      const cellA = getAssignmentsForCell(emp.id, day);
                      const isToday = isSameDay(day, today);
                      return (
                        <div key={day.toISOString()} className={`px-4 py-2.5 flex items-center gap-3 ${isToday ? "bg-primary-muted/30" : ""}`}>
                          <div className={`text-xs w-16 shrink-0 ${isToday ? "font-bold text-primary" : "text-text-muted"}`}>
                            {format(day, "EEE d.", { locale: da })}
                          </div>
                          <div className="flex-1 flex flex-wrap gap-1">
                            {cellA.map((a) => {
                              const resolved = resolveTemplateTime(a.template, parseISO(a.date));
                              return (
                                <span key={a.id} className="inline-flex items-center gap-1 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: a.template.color }}>
                                  {a.hasAbsenceConflict && <span title="Godkendt fravær">⚠️</span>}
                                  {a.template.name} {resolved.startTime}–{resolved.endTime}
                                  {!readOnly && <button onClick={() => deleteAssignment(a.id)} className="hover:opacity-70">×</button>}
                                </span>
                              );
                            })}
                            {deptTemplates.length > 0 && (
                              <button onClick={() => { setAssignModal({ date: day, userId: emp.id }); setAssignTemplateId(deptTemplates[0]?.id ?? ""); setAssignNote(""); setAssignError(""); setAssignConflict(false); }}
                                className="text-xs text-primary hover:opacity-80 px-1">+ vagt</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {assignments.some((a) => a.hasAbsenceConflict) && (
              <p className="mt-3 text-[12px] text-text-muted flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-400 border-2 border-white inline-flex items-center justify-center shrink-0">
                  <AlertTriangle size={8} className="text-white" />
                </span>
                Markerede vagter har konflikt med godkendt fravær.
              </p>
            )}
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold text-text">
                Vagttyper{selectedDeptId && departments.find((d) => d.id === selectedDeptId) ? ` — ${departments.find((d) => d.id === selectedDeptId)?.name}` : ""}
              </h2>
              <button onClick={() => { setEditTplId(null); setTplForm({ name: "", startTime: "08:00", endTime: "16:00", color: "#3b82f6", dayTimeRules: {} }); setShowDayTimeRules(false); setShowTemplateForm(true); }}
                className={cn("bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors", readOnly && "hidden")}>
                + Ny vagttype
              </button>
            </div>

            {showTemplateForm && (
              <div className="bg-bg border border-border rounded-xl p-5 mb-4 space-y-4">
                <h3 className="text-[13px] font-bold text-text">{editTplId ? "Rediger vagttype" : "Ny vagttype"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Navn</label>
                    <input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                      placeholder="f.eks. Dagvagt"
                      className="w-full border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Farve</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {COLORS.map((c) => (
                        <button key={c} onClick={() => setTplForm({ ...tplForm, color: c })}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${tplForm.color === c ? "border-text scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Standard starttid</label>
                    <input type="time" value={tplForm.startTime} onChange={(e) => setTplForm({ ...tplForm, startTime: e.target.value })}
                      className="w-full border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Standard sluttid</label>
                    <input type="time" value={tplForm.endTime} onChange={(e) => setTplForm({ ...tplForm, endTime: e.target.value })}
                      className="w-full border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary" />
                  </div>
                </div>

                {/* Dagspecifikke tider */}
                <div>
                  <button type="button" onClick={() => setShowDayTimeRules(!showDayTimeRules)}
                    className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:opacity-80 transition-opacity">
                    <span className={`transition-transform ${showDayTimeRules ? "rotate-90" : ""} inline-block`}>▶</span>
                    Tilpas tider per ugedag
                  </button>
                  <p className="text-[12px] text-text-subtle mt-0.5 ml-5">
                    Valgfrit — overstyrer standardtiden for specifikke ugedage (f.eks. kortere fredage)
                  </p>
                  {showDayTimeRules && (
                    <div className="mt-3 bg-surface border border-border rounded-xl p-4">
                      <SectionLabel>Dagspecifikke tider</SectionLabel>
                      <p className="text-[12px] text-text-subtle mb-3">
                        Klik på en dag for at angive en særlig tid. Dage uden særlig tid bruger standarden ({tplForm.startTime}–{tplForm.endTime}).
                      </p>
                      <DayTimeRulesEditor value={tplForm.dayTimeRules} onChange={(v) => setTplForm({ ...tplForm, dayTimeRules: v })} defaultStart={tplForm.startTime} defaultEnd={tplForm.endTime} />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={saveTemplate} disabled={tplLoading || !tplForm.name}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors">
                    {tplLoading ? "Gemmer..." : editTplId ? "Gem ændringer" : "Opret"}
                  </button>
                  <button onClick={() => { setShowTemplateForm(false); setEditTplId(null); }}
                    className="text-sm text-text-muted px-3 py-2 hover:text-text">Annuller</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {deptTemplates.length === 0 && (
                <div className="text-center py-10 text-text-subtle text-[13px] border-2 border-dashed border-border rounded-xl">
                  Ingen vagttyper endnu. Opret den første.
                </div>
              )}
              {deptTemplates.map((t) => {
                let parsedRules: Record<string, DayTimeRule> = {};
                if (t.dayTimeRules) { try { parsedRules = JSON.parse(t.dayTimeRules); } catch {} }
                const hasDayRules = Object.keys(parsedRules).length > 0;
                return (
                  <div key={t.id} className="bg-surface border border-border rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <div className="flex-1">
                        <p className="font-semibold text-text text-[13px]">{t.name}</p>
                        <p className="text-[12px] text-text-muted">
                          Standard: {t.startTime} – {t.endTime}
                          {isAdmin && <span className="ml-2 text-text-subtle">{t.department.name}</span>}
                          {hasDayRules && <span className="ml-2 text-primary text-[11px] font-semibold">· Dagspecifikke tider</span>}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditTemplate(t)} className="text-xs text-primary hover:bg-primary-light px-2 py-1 rounded transition-colors">Rediger</button>
                        <button onClick={() => setDeleteTemplateTarget({ id: t.id, name: t.name })} className="text-xs text-danger-text hover:bg-danger-bg px-2 py-1 rounded transition-colors">Slet</button>
                      </div>
                    </div>
                    {hasDayRules && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-1.5">Tidsoverstyring per dag</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(parsedRules).sort(([a], [b]) => {
                            const na = parseInt(a) === 0 ? 7 : parseInt(a);
                            const nb = parseInt(b) === 0 ? 7 : parseInt(b);
                            return na - nb;
                          }).map(([dow, rule]) => (
                            <span key={dow} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-light text-primary">
                              {WEEKDAY_NAMES[parseInt(dow)]}: {(rule as DayTimeRule).start}–{(rule as DayTimeRule).end}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PATTERNS TAB ── */}
        {tab === "patterns" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[13px] font-bold text-text">Gentagelsesmønstre</h2>
                <p className="text-[12px] text-text-subtle mt-0.5">Planlæg automatiske vagter over en periode</p>
              </div>
              <button onClick={() => { setPatternForm({ ...defaultPatternForm(), userId: deptEmployees[0]?.id ?? "", templateId: deptTemplates[0]?.id ?? "" }); setPatternError(""); setShowPatternForm(true); }}
                className={cn("bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors", readOnly && "hidden")}>
                + Nyt mønster
              </button>
            </div>

            {showPatternForm && (
              <div id="pattern-form" className="bg-bg border border-border rounded-xl p-5 mb-5">
                <h3 className="text-[14px] font-bold text-text mb-4">
                  {editPatternId ? "Rediger gentagelsesmønster" : "Nyt gentagelsesmønster"}
                </h3>
                <PatternForm form={patternForm} onChange={setPatternForm} employees={deptEmployees} templates={deptTemplates}
                  loading={patternLoading} error={patternError}
                  onSubmit={editPatternId ? updatePattern : createPattern}
                  onCancel={() => { setShowPatternForm(false); setPatternError(""); setEditPatternId(null); }}
                  submitLabel={editPatternId ? "Gem ændringer og regenerer vagter" : "Opret mønster og generer vagter"} />
              </div>
            )}

            {patternSuccess && !showPatternForm && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success-bg border border-[rgba(5,150,105,.2)] text-success-text text-[13px] font-semibold mb-3">
                {patternSuccess}
                <button onClick={() => setPatternSuccess(null)} className="ml-auto text-success-text hover:opacity-70">×</button>
              </div>
            )}

            <div className="space-y-3">
              {deptPatterns.length === 0 && (
                <div className="text-center py-12 text-text-subtle text-[13px] border-2 border-dashed border-border rounded-xl">
                  <Repeat size={28} className="mx-auto mb-2 opacity-30" />
                  Ingen gentagelsesmønstre endnu.
                </div>
              )}
              {deptPatterns.map((p) => (
                <div key={p.id} className={cn("bg-surface border rounded-xl px-4 py-3 transition-colors", p.active ? "border-border" : "border-border opacity-60")}>
                  <div className="flex items-start gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: p.template.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-text">{p.name}</p>
                        {!p.active && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-bg text-text-subtle border border-border">Inaktiv</span>}
                      </div>
                      <p className="text-[12px] text-text-muted mt-0.5">
                        <span className="font-medium">{p.user.name}</span>
                        {" · "}{p.template.name}
                        {" · "}{format(parseISO(p.startDate), "d. MMM", { locale: da })} – {format(parseISO(p.endDate), "d. MMM yyyy", { locale: da })}
                      </p>
                      <p className="text-[11px] text-text-subtle mt-1">{describePattern(p)}</p>
                      {p.note && <p className="text-[11px] italic text-text-subtle mt-0.5">{p.note}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => regeneratePattern(p)} disabled={regeneratingId === p.id}
                        title="Regenerer vagter fra mønster"
                        className="text-xs text-text-muted hover:text-primary hover:bg-primary-light px-2 py-1.5 rounded transition-colors flex items-center gap-1">
                        <RefreshCw size={12} className={regeneratingId === p.id ? "animate-spin" : ""} />
                        <span className="hidden sm:inline">
                          {regenerateSuccess[p.id] !== undefined
                            ? `✓ ${regenerateSuccess[p.id]} vagt${regenerateSuccess[p.id] !== 1 ? "er" : ""}`
                            : "Regenerer"}
                        </span>
                      </button>
                      <button onClick={() => startEditPattern(p)}
                        className="text-xs text-primary hover:bg-primary-light px-2 py-1.5 rounded transition-colors">
                        Rediger
                      </button>
                      <button onClick={() => togglePatternActive(p)}
                        className="text-xs text-text-muted hover:text-text hover:bg-bg px-2 py-1.5 rounded transition-colors">
                        {p.active ? "Deaktiver" : "Aktiver"}
                      </button>
                      <button onClick={() => setDeletePatternTarget({ id: p.id, name: p.name })}
                        className="text-xs text-danger-text hover:bg-danger-bg px-2 py-1.5 rounded transition-colors">Slet</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {deptPatterns.length > 0 && (
              <p className="mt-4 text-[12px] text-text-subtle">
                Brug <strong>Regenerer</strong> til at genskabe vagter fra et mønster efter ændringer.
              </p>
            )}
          </div>
        )}

        {/* Assignment modal */}
        {assignModal && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-[3px] z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4">
              <div>
                <h2 className="text-[17px] font-extrabold tracking-tight text-text">Tilføj vagt</h2>
                <p className="text-[13px] text-text-muted mt-0.5">
                  {employees.find((e) => e.id === assignModal.userId)?.name} · {format(assignModal.date, "EEEE d. MMMM", { locale: da })}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">Vagttype</label>
                <div className="space-y-2">
                  {deptTemplates.map((t) => {
                    const resolved = resolveTemplateTime(t, assignModal.date);
                    return (
                      <label key={t.id}
                        className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                          assignTemplateId === t.id ? "border-primary bg-primary-light" : "border-border hover:bg-bg")}>
                        <input type="radio" name="template" value={t.id} checked={assignTemplateId === t.id}
                          onChange={() => setAssignTemplateId(t.id)} className="accent-primary" />
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <div>
                          <p className="text-[13px] font-semibold text-text">{t.name}</p>
                          <p className="text-[12px] text-text-muted">
                            {resolved.startTime}–{resolved.endTime}
                            {t.dayTimeRules && <span className="ml-1.5 text-primary text-[11px]">(dagspecifik)</span>}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">Note (valgfri)</label>
                <input value={assignNote} onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="Fx overtid, kørsel..."
                  className="w-full border border-border rounded-[10px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]" />
              </div>
              {assignError && <p className="text-danger-text text-xs">{assignError}</p>}
              {assignConflict && (
                <div className="bg-warning-bg border border-[rgba(217,119,6,.2)] rounded-lg p-3 text-[13px] text-warning-text">
                  ⚠️ <strong>Advarsel:</strong> Medarbejderen har godkendt fravær denne dag. Vagten er gemt, men der er en konflikt.
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={createAssignment} disabled={assignLoading || !assignTemplateId}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors">
                  {assignLoading ? "Gemmer..." : "Tilføj vagt"}
                </button>
                <button onClick={() => { setAssignModal(null); setAssignConflict(false); }}
                  className="px-4 py-2.5 text-sm text-text-muted hover:text-text transition-colors">
                  {assignConflict ? "Luk" : "Annuller"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog open={!!deleteTemplateTarget} title="Slet vagttype"
        message={`Er du sikker på at du vil slette vagttypen "${deleteTemplateTarget?.name}"? Alle tilknyttede vagter slettes også.`}
        confirmLabel="Slet vagttype" onConfirm={confirmDeleteTemplate} onClose={() => setDeleteTemplateTarget(null)} />

      <ConfirmDialog open={!!deletePatternTarget} title="Slet mønster"
        message={`Er du sikker på at du vil slette mønsteret "${deletePatternTarget?.name}"? Allerede genererede vagter slettes ikke automatisk.`}
        confirmLabel="Slet mønster" onConfirm={confirmDeletePattern} onClose={() => setDeletePatternTarget(null)} />

      <PrintShiftPlan weekStart={weekStart} assignments={assignments} employees={employees}
        departments={departments} selectedDeptId={selectedDeptId} isAdmin={isAdmin} />
    </div>
  );
}
