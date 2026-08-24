"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  format, isWeekend, getISOWeek,
  startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval,
} from "date-fns";
import { da } from "date-fns/locale";
import { getMonthDays, formatMonthYear, cn, ENTRY_TYPE_LABELS, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS, formatDate } from "@/lib/utils";
import { buildDeptColorMap, type DeptColor } from "@/lib/dept-colors";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ChevronLeft, ChevronRight, Printer, AlertTriangle } from "lucide-react";
import { PrintCalendarView } from "@/components/PrintCalendarView";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarUser { id: string; name: string; }

interface CalendarDepartment {
  id: string; name: string; maxConcurrent: number; shiftsEnabled: boolean; users: CalendarUser[];
}

interface CalendarEntry { date: string; type: string; absenceType: string; days: number; }

interface CalendarRequest {
  id: string;
  status: "APPROVED" | "PENDING";
  note: string | null;
  user: { id: string; name: string };
  entries: CalendarEntry[];
}

interface CalendarHoliday { id: string; name: string; date: string; isNational: boolean; }

export interface CalendarShift {
  id: string;
  userId: string;
  date: string;
  templateName: string;
  startTime: string;
  endTime: string;
  color: string;
  note: string | null;
  hasAbsenceConflict?: boolean;
}

interface CellModalData {
  dateKey: string; user: CalendarUser; requests: CalendarRequest[]; holidayName: string | null; shifts: CalendarShift[];
}

export interface CalendarGridProps {
  year: number; month: number;
  departments: CalendarDepartment[];
  requests: CalendarRequest[];
  holidays: CalendarHoliday[];
  shifts?: CalendarShift[];
  currentUserId?: string;
  currentUserDeptId?: string | null;
  isManagerOrAdmin?: boolean;
}

type ViewMode = "month" | "week";
type PersonalFilter = "all" | "dept" | "me";

// ─── Cell detail modal ────────────────────────────────────────────────────────

function CellDetailModal({ data, onClose }: { data: CellModalData | null; onClose: () => void }) {
  if (!data) return null;
  const { dateKey, user, requests, holidayName, shifts } = data;
  return (
    <Modal open={!!data} onClose={onClose} title={`${user.name} · ${formatDate(dateKey)}`} className="sm:max-w-md">
      <div className="space-y-4">
        {holidayName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger-bg border border-[rgba(220,38,38,.15)] text-[13px] text-danger-text">
            🎌 {holidayName}
          </div>
        )}

        {shifts.length > 0 && (
          <div className="space-y-2">
            <SectionLabel>Vagter</SectionLabel>
            {shifts.map((s) => (
              <div key={s.id} className="rounded-lg text-white text-[13px] overflow-hidden" style={{ backgroundColor: s.color }}>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="font-semibold">{s.templateName}</span>
                  <span className="opacity-80 text-[12px]">{s.startTime}–{s.endTime}</span>
                  {s.note && <span className="opacity-70 text-[12px] italic ml-auto">{s.note}</span>}
                </div>
                {s.hasAbsenceConflict && (
                  <div className="bg-amber-400/25 px-3 py-1.5 text-[12px] font-semibold flex items-center gap-1.5 border-t border-white/20">
                    <AlertTriangle size={12} /> Konflikt — godkendt fravær denne dag
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {requests.length === 0 && shifts.length === 0 && (
          <p className="text-[13px] text-text-muted">Ingen ansøgning denne dag.</p>
        )}

        {requests.map((req) => {
          const dayEntry = req.entries.find((e) => new Date(e.date).toISOString().slice(0, 10) === dateKey);
          const totalDays = req.entries.reduce((s, e) => s + e.days, 0);
          return (
            <div key={req.id} className="border border-border rounded-lg p-4 space-y-2 bg-bg">
              <div className="flex items-center justify-between">
                <StatusBadge status={req.status} />
                <span className="text-[12px] text-text-subtle">{totalDays} dag{totalDays !== 1 ? "e" : ""} samlet</span>
              </div>
              {dayEntry && (
                <div className="text-[13px] text-text">
                  <span className="font-semibold">Denne dag: </span>
                  {ABSENCE_TYPE_LABELS[dayEntry.absenceType] ?? dayEntry.absenceType}
                  {" · "}
                  {ENTRY_TYPE_LABELS[dayEntry.type] ?? dayEntry.type}
                  {dayEntry.days === 0.5 && <span className="ml-1 text-text-muted">(½ dag)</span>}
                </div>
              )}
              {req.note && (
                <p className="text-[12px] text-text-muted italic bg-surface rounded-md px-2 py-1.5">"{req.note}"</p>
              )}
              <div className="pt-2 border-t border-border">
                <p className="text-[11px] text-text-subtle mb-1.5">Alle datoer i denne ansøgning</p>
                <div className="flex flex-wrap gap-1">
                  {[...req.entries]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((e) => {
                      const eKey = new Date(e.date).toISOString().slice(0, 10);
                      return (
                        <span key={eKey} className={cn(
                          "text-[11px] px-1.5 py-0.5 rounded-md font-medium",
                          eKey === dateKey
                            ? "bg-primary-light text-primary"
                            : "bg-surface border border-border text-text-muted"
                        )}>
                          {format(new Date(e.date), "d/M")}{e.days === 0.5 && "½"}
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── Capacity indicator ───────────────────────────────────────────────────────

function CapacityDot({ count, max }: { count: number; max: number }) {
  if (count === 0) return null;
  return (
    <div title={`${count}/${max} godkendt`}
      className={cn("text-[9px] font-bold leading-none text-center", count > max ? "text-red-300" : "text-white/60")}>
      {count}/{max}
    </div>
  );
}

// ─── Grid table ───────────────────────────────────────────────────────────────

function CalendarTable({
  days, departments, holidayMap, requestLookup, deptCapacity, deptColorMap, todayKey, onOpenCell, isManagerOrAdmin, shiftLookup,
}: {
  days: Date[];
  departments: CalendarDepartment[];
  holidayMap: Map<string, string>;
  requestLookup: Map<string, Map<string, CalendarRequest[]>>;
  deptCapacity: Map<string, Map<string, number>>;
  deptColorMap: Map<string, DeptColor>;
  todayKey: string;
  onOpenCell: (dk: string, user: CalendarUser, reqs: CalendarRequest[], shifts: CalendarShift[]) => void;
  isManagerOrAdmin?: boolean;
  shiftLookup: Map<string, Map<string, CalendarShift[]>>;
}) {
  return (
    <table className="border-collapse text-xs" style={{ minWidth: "max-content" }}>
      <thead className="sticky top-0 z-20">
        <tr>
          {/* Name column header */}
          <th
            className="sticky left-0 z-30 border-b border-r px-3 py-2 text-left font-bold whitespace-nowrap text-[11px] uppercase tracking-wide"
            style={{ minWidth: 160, background: "var(--c-surface)", borderColor: "var(--c-border)", color: "var(--c-text-subtle)" }}
          >
            Medarbejder
          </th>
          {days.map((d) => {
            const dk = format(d, "yyyy-MM-dd");
            const holiday = holidayMap.get(dk);
            const weekend = isWeekend(d);
            const isToday = dk === todayKey;
            return (
              <th
                key={dk}
                title={holiday ?? undefined}
                className={cn(
                  "border-b border-r text-center font-normal select-none min-w-[34px] w-9 py-1.5 px-0",
                  isToday ? "ring-2 ring-inset ring-primary" : "",
                )}
                style={{
                  borderColor: "var(--c-border)",
                  background: holiday
                    ? "var(--c-danger-bg)"
                    : weekend
                    ? "var(--c-bg)"
                    : isToday
                    ? "var(--c-primary-light)"
                    : "var(--c-surface)",
                  color: holiday
                    ? "var(--c-danger-text)"
                    : weekend
                    ? "var(--c-text-subtle)"
                    : isToday
                    ? "var(--c-primary)"
                    : "var(--c-text-muted)",
                }}
              >
                <div className="font-bold text-[12px]">{format(d, "d")}</div>
                <div className="text-[9px] uppercase opacity-70">{format(d, "EEEEE", { locale: da })}</div>
                {holiday && <div className="text-[8px] leading-tight">🎌</div>}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {departments.map((dept) => {
          const capacityMap = deptCapacity.get(dept.id) ?? new Map();
          const color = deptColorMap.get(dept.id);
          const headerBg = color?.hex ?? "#334155";
          const cellBg = color?.hexLight ?? "#bbf7d0";

          return (
            <>
              {/* Dept header row */}
              <tr key={`dept-${dept.id}`}>
                <td
                  className="sticky left-0 z-10 text-white px-3 py-1.5 font-bold text-[11px] uppercase tracking-widest whitespace-nowrap border-b"
                  style={{ minWidth: 160, backgroundColor: headerBg, borderColor: `${headerBg}cc` }}
                >
                  {dept.name}
                </td>
                {days.map((d) => {
                  const dk = format(d, "yyyy-MM-dd");
                  const count = capacityMap.get(dk) ?? 0;
                  const weekend = isWeekend(d);
                  const holiday = holidayMap.has(dk);
                  return (
                    <td key={dk} className="border-b border-r text-center py-0.5"
                      style={{ borderColor: `${headerBg}66`, backgroundColor: weekend || holiday ? `${headerBg}88` : headerBg }}>
                      <CapacityDot count={count} max={dept.maxConcurrent} />
                    </td>
                  );
                })}
              </tr>

              {/* Employee rows */}
              {dept.users.map((emp, empIdx) => (
                <tr key={emp.id} className="group transition-colors"
                  style={{ background: empIdx % 2 === 0 ? "var(--c-surface)" : "var(--c-bg)" }}>
                  <td
                    className="sticky left-0 z-10 border-b border-r px-3 py-1.5 whitespace-nowrap font-semibold text-[12px]"
                    style={{
                      minWidth: 160,
                      background: empIdx % 2 === 0 ? "var(--c-surface)" : "var(--c-bg)",
                      borderColor: "var(--c-border)",
                      color: "var(--c-text)",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color?.hexDot ?? "#64748b" }} />
                      {emp.name}
                    </span>
                  </td>
                  {days.map((d) => {
                    const dk = format(d, "yyyy-MM-dd");
                    const reqs = requestLookup.get(emp.id)?.get(dk) ?? [];
                    const cellShifts = dept.shiftsEnabled
                      ? (shiftLookup.get(emp.id)?.get(dk) ?? [])
                      : [];
                    const weekend = isWeekend(d);
                    const holiday = holidayMap.has(dk);
                    const hasApproved = reqs.some((r) => r.status === "APPROVED");
                    const hasPending = reqs.some((r) => r.status === "PENDING") && !!isManagerOrAdmin;
                    const approvedEntry = reqs.find((r) => r.status === "APPROVED")?.entries.find((e) => new Date(e.date).toISOString().slice(0, 10) === dk);
                    const hasShift = cellShifts.length > 0;
                    const clickable = reqs.length > 0 || holiday || hasShift;

                    let cellStyle: React.CSSProperties = { borderColor: "var(--c-border)" };
                    let cellClass = "transition-colors";

                    if (hasApproved) {
                      cellStyle = { ...cellStyle, backgroundColor: cellBg };
                      cellClass += " hover:brightness-95";
                    } else if (hasPending) {
                      cellStyle = { ...cellStyle, background: "var(--c-warning-bg)" };
                      cellClass += " hover:opacity-90";
                    } else if (holiday) {
                      cellStyle = { ...cellStyle, background: "var(--c-danger-bg)" };
                    } else if (weekend) {
                      cellStyle = { ...cellStyle, background: "var(--c-bg)" };
                    } else {
                      cellClass += " hover:bg-primary-muted/20";
                    }

                    return (
                      <td
                        key={dk}
                        onClick={() => clickable && onOpenCell(dk, emp, reqs, cellShifts)}
                        className={cn("border-b border-r text-center h-7 w-9 relative", cellClass, clickable ? "cursor-pointer" : "cursor-default")}
                        style={cellStyle}
                      >
                        {hasApproved && (
                          <span className="font-bold leading-none" style={{ fontSize: approvedEntry?.days === 0.5 ? "9px" : "11px", color: color?.hexDot ?? "#334155" }}>
                            {approvedEntry?.days === 0.5 ? "½" : "✓"}
                          </span>
                        )}
                        {!hasApproved && hasPending && (
                          <span className="font-bold text-[11px] leading-none" style={{ color: "var(--c-warning)" }}>?</span>
                        )}
                        {hasShift && !hasApproved && !hasPending && (
                          <span className="flex items-center justify-center gap-0.5">
                            {cellShifts.slice(0, 2).map((s) => (
                              <span key={s.id} className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} title={s.templateName} />
                            ))}
                          </span>
                        )}
                        {hasShift && (hasApproved || hasPending) && (
                          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: cellShifts[0].color }}
                            title={cellShifts[0].hasAbsenceConflict ? "Vagt: konflikt med godkendt fravær" : cellShifts[0].templateName}
                          />
                        )}
                        {hasShift && cellShifts.some((s) => s.hasAbsenceConflict) && (
                          <span className="absolute top-0.5 right-0.5 text-[9px] leading-none" title="Vagt: konflikt med godkendt fravær">⚠️</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Mobile list view ─────────────────────────────────────────────────────────

function MobileCalendarList({
  year, month, departments, requests, holidays, onNavigate, deptColorMap,
}: CalendarGridProps & { onNavigate: (delta: number) => void; deptColorMap: Map<string, DeptColor> }) {
  const holidayMap = useMemo(() => new Map<string, string>(holidays.map((h) => [new Date(h.date).toISOString().slice(0, 10), h.name])), [holidays]);
  const requestsByUser = useMemo(() => {
    const map = new Map<string, CalendarRequest[]>();
    for (const req of requests) {
      if (!map.has(req.user.id)) map.set(req.user.id, []);
      map.get(req.user.id)!.push(req);
    }
    return map;
  }, [requests]);

  const activeUsers = departments
    .flatMap((d) => d.users.map((u) => ({ ...u, deptName: d.name, deptId: d.id })))
    .filter((u) => requestsByUser.has(u.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button onClick={() => onNavigate(-1)}
          className="w-9 h-9 flex items-center justify-center border border-border rounded-md text-text-muted hover:text-text hover:bg-bg transition-colors"
          aria-label="Forrige måned">
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-[15px] font-bold text-text capitalize flex-1 text-center">{formatMonthYear(year, month)}</h2>
        <button onClick={() => onNavigate(1)}
          className="w-9 h-9 flex items-center justify-center border border-border rounded-md text-text-muted hover:text-text hover:bg-bg transition-colors"
          aria-label="Næste måned">
          <ChevronRight size={16} />
        </button>
      </div>

      {holidays.length > 0 && (
        <div className="bg-danger-bg border border-[rgba(220,38,38,.15)] rounded-lg p-3 space-y-1">
          <p className="text-[11px] font-bold text-danger-text uppercase tracking-wide">Helligdage denne måned</p>
          {holidays.map((h) => (
            <div key={h.id} className="flex justify-between text-[13px] text-danger-text">
              <span>🎌 {h.name}</span>
              <span className="text-[12px]">{formatDate(h.date)}</span>
            </div>
          ))}
        </div>
      )}

      {activeUsers.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-text-subtle text-[13px]">Ingen godkendte ansøgninger denne måned.</p>
        </div>
      ) : (
        activeUsers.map((u) => {
          const reqs = requestsByUser.get(u.id) ?? [];
          const color = deptColorMap.get(u.deptId);
          return (
            <div key={u.id} className="bg-surface border border-border rounded-lg overflow-hidden shadow-xs">
              <div className="text-white px-4 py-2.5" style={{ backgroundColor: color?.hex ?? "#334155" }}>
                <span className="font-semibold text-[13px]">{u.name}</span>
                <span className="text-white/60 text-[12px] ml-2">{u.deptName}</span>
              </div>
              <div className="divide-y divide-border">
                {reqs.map((req) => {
                  const sorted = [...req.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  const totalDays = req.entries.reduce((s, e) => s + e.days, 0);
                  const first = sorted[0];
                  const last = sorted[sorted.length - 1];
                  return (
                    <div key={req.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={req.status} />
                        <span className="text-[12px] text-text-muted">{totalDays} dag{totalDays !== 1 ? "e" : ""}</span>
                      </div>
                      <p className="text-[13px] text-text">
                        {first && last ? (first.date.slice(0, 10) === last.date.slice(0, 10) ? formatDate(first.date) : `${formatDate(first.date)} – ${formatDate(last.date)}`) : "—"}
                      </p>
                      {req.note && <p className="text-[12px] text-text-subtle italic mt-0.5">"{req.note}"</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Pill tab helper ──────────────────────────────────────────────────────────

function PillTabs<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg border border-border bg-bg">
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1 rounded-md text-[12px] font-semibold transition-colors",
            value === opt.value ? "bg-surface text-text shadow-xs" : "text-text-muted hover:text-text"
          )}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarGrid({
  year, month, departments, requests, holidays, shifts = [],
  currentUserId, currentUserDeptId, isManagerOrAdmin,
}: CalendarGridProps) {
  const router = useRouter();
  const [cellModal, setCellModal] = useState<CellModalData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [personalFilter, setPersonalFilter] = useState<PersonalFilter>("all");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const deptColorMap = useMemo(() => buildDeptColorMap(departments.map((d) => d.id)), [departments]);

  const filteredDepartments = useMemo(() => {
    if (personalFilter === "all") return departments;
    if (personalFilter === "dept") return departments.map((d) => ({ ...d, users: d.users.filter(() => d.id === currentUserDeptId) })).filter((d) => d.users.length > 0);
    if (personalFilter === "me") return departments.map((d) => ({ ...d, users: d.users.filter((u) => u.id === currentUserId) })).filter((d) => d.users.length > 0);
    return departments;
  }, [departments, personalFilter, currentUserId, currentUserDeptId]);

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);
  const weekDays  = useMemo(() => eachDayOfInterval({ start: startOfWeek(weekStart, { weekStartsOn: 1 }), end: endOfWeek(weekStart, { weekStartsOn: 1 }) }), [weekStart]);
  const days = viewMode === "month" ? monthDays : weekDays;

  const holidayMap = useMemo(() => new Map<string, string>(holidays.map((h) => [new Date(h.date).toISOString().slice(0, 10), h.name])), [holidays]);

  const shiftLookup = useMemo(() => {
    const map = new Map<string, Map<string, CalendarShift[]>>();
    for (const s of shifts) {
      const dk = new Date(s.date).toISOString().slice(0, 10);
      if (!map.has(s.userId)) map.set(s.userId, new Map());
      const dm = map.get(s.userId)!;
      if (!dm.has(dk)) dm.set(dk, []);
      dm.get(dk)!.push(s);
    }
    return map;
  }, [shifts]);

  const requestLookup = useMemo(() => {
    const map = new Map<string, Map<string, CalendarRequest[]>>();
    for (const req of requests) {
      for (const entry of req.entries) {
        const dk = new Date(entry.date).toISOString().slice(0, 10);
        if (!map.has(req.user.id)) map.set(req.user.id, new Map());
        const dm = map.get(req.user.id)!;
        if (!dm.has(dk)) dm.set(dk, []);
        dm.get(dk)!.push(req);
      }
    }
    return map;
  }, [requests]);

  const deptCapacity = useMemo(() => {
    // ⚡ Bolt: Optimize department capacity calculation
    // Pre-calculate user to department mapping (O(Departments * Users))
    // to avoid O(Departments * Requests * Users) in nested loops.
    const userToDeptMap = new Map<string, string[]>();
    for (const dept of departments) {
      for (const u of dept.users) {
        const depts = userToDeptMap.get(u.id) ?? [];
        depts.push(dept.id);
        userToDeptMap.set(u.id, depts);
      }
    }

    const outer = new Map<string, Map<string, number>>();
    for (const dept of departments) {
      outer.set(dept.id, new Map<string, number>());
    }

    for (const req of requests) {
      if (req.status !== "APPROVED") continue;

      const deptIds = userToDeptMap.get(req.user.id);
      if (!deptIds) continue;

      for (const deptId of deptIds) {
        const dm = outer.get(deptId);
        if (!dm) continue;

        for (const entry of req.entries) {
          const dk = new Date(entry.date).toISOString().slice(0, 10);
          dm.set(dk, (dm.get(dk) ?? 0) + 1);
        }
      }
    }
    return outer;
  }, [departments, requests]);

  function navigateMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    router.push(`/manager/calendar?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
  }
  function navigateWeek(delta: number) {
    setWeekStart((w) => delta > 0 ? addWeeks(w, 1) : subWeeks(w, 1));
  }
  function goToToday() {
    if (viewMode === "week") setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const n = new Date();
    router.push(`/manager/calendar?year=${n.getFullYear()}&month=${n.getMonth() + 1}`);
  }

  const weekLabel = weekDays.length > 0
    ? `${format(weekDays[0], "d. MMM", { locale: da })} – ${format(weekDays[6], "d. MMM yyyy", { locale: da })}`
    : "";

  const viewOptions: { value: ViewMode; label: string }[] = [
    { value: "month", label: "Måned" },
    { value: "week",  label: "Uge" },
  ];
  const filterOptions: { value: PersonalFilter; label: string }[] = [
    { value: "all",  label: "Alle" },
    { value: "dept", label: "Min afdeling" },
    { value: "me",   label: "Kun mig" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Mobile */}
      <div className="md:hidden no-print">
        <MobileCalendarList
          year={year} month={month} departments={filteredDepartments}
          requests={requests} holidays={holidays}
          onNavigate={navigateMonth} deptColorMap={deptColorMap}
        />
      </div>

      {/* Desktop */}
      <div className="hidden md:flex flex-col h-full gap-4 no-print">

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Nav */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => viewMode === "month" ? navigateMonth(-1) : navigateWeek(-1)}
              className="w-8 h-8 flex items-center justify-center border border-border rounded-md text-text-muted hover:text-text hover:bg-bg transition-colors"
              aria-label="Forrige">
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-[17px] font-extrabold text-text capitalize min-w-[220px] text-center tracking-tight">
              {viewMode === "month" ? formatMonthYear(year, month) : weekLabel}
            </h2>
            <button
              onClick={() => viewMode === "month" ? navigateMonth(1) : navigateWeek(1)}
              className="w-8 h-8 flex items-center justify-center border border-border rounded-md text-text-muted hover:text-text hover:bg-bg transition-colors"
              aria-label="Næste">
              <ChevronRight size={16} />
            </button>
            <button onClick={goToToday}
              className="text-[12px] font-semibold text-primary hover:text-primary-hover ml-1 px-2 py-1 rounded-md hover:bg-primary-muted transition-colors">
              I dag
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <PillTabs options={viewOptions} value={viewMode} onChange={setViewMode} />
            <PillTabs options={filterOptions} value={personalFilter} onChange={setPersonalFilter} />
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-md text-[12px] font-semibold border border-border text-text-muted hover:text-text hover:bg-bg transition-colors no-print"
              aria-label="Print kalender"
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {/* Legend row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Dept chips */}
          <div className="flex flex-wrap gap-3">
            {departments.map((dept) => {
              const color = deptColorMap.get(dept.id);
              return (
                <span key={dept.id} className="flex items-center gap-1.5 text-[12px] text-text-muted">
                  <span className="w-3 h-3 rounded-sm inline-block border border-border/50"
                    style={{ backgroundColor: color?.hex ?? "#64748b" }} />
                  {dept.name}
                </span>
              );
            })}
          </div>
          {/* Status legend */}
          <div className="flex gap-3">
            {[
              { bg: "var(--c-warning-bg)", label: "Afventer" },
              { bg: "var(--c-danger-bg)",  label: "Helligdag" },
              { bg: "var(--c-bg)",         label: "Weekend" },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-[12px] text-text-muted">
                <span className="w-3 h-3 rounded-sm inline-block border border-border"
                  style={{ backgroundColor: item.bg }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div ref={scrollRef}
          className="overflow-auto border border-border rounded-lg shadow-xs"
          style={{ maxHeight: "calc(100vh - 240px)" }}>
          <CalendarTable
            days={days}
            departments={filteredDepartments}
            holidayMap={holidayMap}
            requestLookup={requestLookup}
            deptCapacity={deptCapacity}
            deptColorMap={deptColorMap}
            todayKey={todayKey}
            onOpenCell={(dk, user, reqs, cellShifts) => setCellModal({ dateKey: dk, user, requests: reqs, holidayName: holidayMap.get(dk) ?? null, shifts: cellShifts })}
            isManagerOrAdmin={isManagerOrAdmin}
            shiftLookup={shiftLookup}
          />
        </div>
      </div>

      <CellDetailModal data={cellModal} onClose={() => setCellModal(null)} />

      {/* Inline print view — only visible when printing */}
      <PrintCalendarView
        year={year}
        month={month}
        days={days}
        printTitle={
          viewMode === "week"
            ? `Uge ${getISOWeek(weekDays[0])} · ${format(weekDays[0], "d. MMM", { locale: da })}–${format(weekDays[6], "d. MMM yyyy", { locale: da })}`
            : undefined
        }
        departments={filteredDepartments}
        requests={requests}
        holidays={holidays}
        isManagerOrAdmin={!!isManagerOrAdmin}
      />
    </div>
  );
}
