"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  format, isWeekend,
  startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval,
} from "date-fns";
import { da } from "date-fns/locale";
import { getMonthDays, formatMonthYear, cn, ENTRY_TYPE_LABELS, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS, formatDate } from "@/lib/utils";
import { buildDeptColorMap, type DeptColor } from "@/lib/dept-colors";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

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
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-700">🎌 {holidayName}</div>
        )}
        {shifts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vagter</p>
            {shifts.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm" style={{ backgroundColor: s.color }}>
                <span className="font-semibold">{s.templateName}</span>
                <span className="opacity-80 text-xs">{s.startTime}–{s.endTime}</span>
                {s.note && <span className="opacity-70 text-xs italic ml-auto">{s.note}</span>}
              </div>
            ))}
          </div>
        )}
        {requests.length === 0 && shifts.length === 0 && <p className="text-sm text-gray-500">Ingen ansøgning denne dag.</p>}
        {requests.map((req) => {
          const dayEntry = req.entries.find((e) => new Date(e.date).toISOString().slice(0, 10) === dateKey);
          const totalDays = req.entries.reduce((s, e) => s + e.days, 0);
          return (
            <div key={req.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <StatusBadge status={req.status} />
                <span className="text-xs text-gray-400">{totalDays} dag{totalDays !== 1 ? "e" : ""} samlet</span>
              </div>
              {dayEntry && (
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Denne dag: </span>
                  {ABSENCE_TYPE_LABELS[dayEntry.absenceType] ?? dayEntry.absenceType}
                  {" · "}
                  {ENTRY_TYPE_LABELS[dayEntry.type] ?? dayEntry.type}
                  {dayEntry.days === 0.5 && <span className="ml-1 text-gray-500">(½ dag)</span>}
                </div>
              )}
              {req.note && <p className="text-xs text-gray-500 italic bg-gray-50 rounded px-2 py-1">"{req.note}"</p>}
              <div className="pt-1 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Alle datoer i denne ansøgning</p>
                <div className="flex flex-wrap gap-1">
                  {[...req.entries]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((e) => {
                      const eKey = new Date(e.date).toISOString().slice(0, 10);
                      return (
                        <span key={eKey} className={cn("text-xs px-1.5 py-0.5 rounded", eKey === dateKey ? "bg-blue-100 text-blue-700 font-semibold" : "bg-gray-100 text-gray-600")}>
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
    <div title={`${count}/${max} godkendt`} className={cn("text-[9px] font-bold leading-none text-center", count > max ? "text-red-300" : "text-white/50")}>
      {count}/{max}
    </div>
  );
}

// ─── Legend item ─────────────────────────────────────────────────────────────

function LegendItem({ hex, label }: { hex?: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-3 h-3 rounded-sm inline-block border border-gray-200"
        style={hex ? { backgroundColor: hex } : {}}
        aria-hidden="true"
      />
      <span className="text-xs text-gray-500">{label}</span>
    </span>
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
          <th className="sticky left-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap" style={{ minWidth: 160 }}>
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
                  "border-b border-r border-gray-200 text-center font-normal select-none min-w-[32px] w-8 py-1.5 px-0",
                  weekend && !holiday ? "bg-gray-100 text-gray-400" : "",
                  holiday ? "bg-red-100 text-red-700" : "",
                  !weekend && !holiday ? "bg-gray-50 text-gray-600" : "",
                  isToday ? "ring-2 ring-inset ring-blue-400" : ""
                )}
              >
                <div className="font-semibold text-[11px]">{format(d, "d")}</div>
                <div className="text-[9px] uppercase opacity-60">{format(d, "EEEEE", { locale: da })}</div>
                {holiday && <div className="text-[8px] text-red-500 leading-tight" title={holiday}>🎌</div>}
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
                  className="sticky left-0 z-10 text-white px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wide whitespace-nowrap border-b"
                  style={{ minWidth: 160, backgroundColor: headerBg }}
                >
                  {dept.name}
                </td>
                {days.map((d) => {
                  const dk = format(d, "yyyy-MM-dd");
                  const count = capacityMap.get(dk) ?? 0;
                  const weekend = isWeekend(d);
                  const holiday = holidayMap.has(dk);
                  return (
                    <td key={dk} className="border-b border-r text-center py-0.5" style={{ backgroundColor: weekend || holiday ? `${headerBg}99` : headerBg }}>
                      <CapacityDot count={count} max={dept.maxConcurrent} />
                    </td>
                  );
                })}
              </tr>

              {/* Employee rows */}
              {dept.users.map((emp, empIdx) => (
                <tr key={emp.id} className={cn("group transition-colors", empIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                  <td
                    className={cn("sticky left-0 z-10 border-b border-r border-gray-200 px-3 py-1.5 whitespace-nowrap font-medium text-gray-800 text-[12px]", empIdx % 2 === 0 ? "bg-white" : "bg-gray-50")}
                    style={{ minWidth: 160 }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color?.hexDot ?? "#64748b" }} aria-hidden="true" />
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

                    let bgStyle: React.CSSProperties = {};
                    let bgClass = "";
                    if (hasApproved) { bgStyle = { backgroundColor: cellBg }; bgClass = "hover:brightness-95"; }
                    else if (hasPending) bgClass = "bg-yellow-200 hover:bg-yellow-300";
                    else if (holiday) bgClass = "bg-red-50";
                    else if (weekend) bgClass = "bg-gray-100";
                    else bgClass = "hover:bg-blue-50";

                    return (
                      <td
                        key={dk}
                        onClick={() => clickable && onOpenCell(dk, emp, reqs, cellShifts)}
                        className={cn("border-b border-r border-gray-100 text-center transition-colors h-7 w-8 relative", bgClass, clickable ? "cursor-pointer" : "cursor-default")}
                        style={bgStyle}
                      >
                        {hasApproved && (
                          <span className="font-bold leading-none text-gray-700" style={{ fontSize: approvedEntry?.days === 0.5 ? "9px" : "11px" }}>
                            {approvedEntry?.days === 0.5 ? "½" : "✓"}
                          </span>
                        )}
                        {!hasApproved && hasPending && (
                          <span className="text-yellow-700 font-bold text-[11px] leading-none">?</span>
                        )}
                        {hasShift && !hasApproved && !hasPending && (
                          <span className="flex items-center justify-center gap-0.5">
                            {cellShifts.slice(0, 2).map((s) => (
                              <span key={s.id} className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} title={s.templateName} />
                            ))}
                          </span>
                        )}
                        {hasShift && (hasApproved || hasPending) && (
                          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cellShifts[0].color }} />
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
        <button onClick={() => onNavigate(-1)} className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Forrige måned">‹</button>
        <h2 className="text-lg font-bold text-gray-900 capitalize">{formatMonthYear(year, month)}</h2>
        <button onClick={() => onNavigate(1)} className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Næste måned">›</button>
      </div>

      {holidays.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-red-700 uppercase">Helligdage denne måned</p>
          {holidays.map((h) => (
            <div key={h.id} className="flex justify-between text-sm text-red-700">
              <span>🎌 {h.name}</span>
              <span className="text-xs text-red-500">{formatDate(h.date)}</span>
            </div>
          ))}
        </div>
      )}

      {activeUsers.length === 0 ? (
        <div className="py-10 text-center"><p className="text-gray-400 text-sm">Ingen godkendte ansøgninger denne måned.</p></div>
      ) : (
        activeUsers.map((u) => {
          const reqs = requestsByUser.get(u.id) ?? [];
          const color = deptColorMap.get(u.deptId);
          return (
            <div key={u.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="text-white px-4 py-2.5" style={{ backgroundColor: color?.hex ?? "#334155" }}>
                <span className="font-semibold text-sm">{u.name}</span>
                <span className="text-white/60 text-xs ml-2">{u.deptName}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {reqs.map((req) => {
                  const sorted = [...req.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  const totalDays = req.entries.reduce((s, e) => s + e.days, 0);
                  const first = sorted[0];
                  const last = sorted[sorted.length - 1];
                  return (
                    <div key={req.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={req.status} />
                        <span className="text-xs text-gray-500">{totalDays} dag{totalDays !== 1 ? "e" : ""}</span>
                      </div>
                      <p className="text-sm text-gray-800">
                        {first && last ? (first.date.slice(0, 10) === last.date.slice(0, 10) ? formatDate(first.date) : `${formatDate(first.date)} – ${formatDate(last.date)}`) : "—"}
                      </p>
                      {req.note && <p className="text-xs text-gray-400 italic mt-0.5">"{req.note}"</p>}
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
  const weekDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(weekStart, { weekStartsOn: 1 }), end: endOfWeek(weekStart, { weekStartsOn: 1 }) }), [weekStart]);
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
    const outer = new Map<string, Map<string, number>>();
    for (const dept of departments) {
      const dm = new Map<string, number>();
      for (const req of requests) {
        if (req.status !== "APPROVED") continue;
        if (!dept.users.some((u) => u.id === req.user.id)) continue;
        for (const entry of req.entries) {
          const dk = new Date(entry.date).toISOString().slice(0, 10);
          dm.set(dk, (dm.get(dk) ?? 0) + 1);
        }
      }
      outer.set(dept.id, dm);
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

  return (
    <div className="flex flex-col h-full">
      {/* Mobile */}
      <div className="md:hidden">
        <MobileCalendarList
          year={year} month={month} departments={filteredDepartments}
          requests={requests} holidays={holidays}
          onNavigate={navigateMonth} deptColorMap={deptColorMap}
        />
      </div>

      {/* Desktop */}
      <div className="hidden md:flex flex-col h-full gap-3">
        {/* Toolbar row 1 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => viewMode === "month" ? navigateMonth(-1) : navigateWeek(-1)} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Forrige">‹</button>
            <h2 className="text-xl font-bold text-gray-900 capitalize min-w-[200px] text-center">
              {viewMode === "month" ? formatMonthYear(year, month) : weekLabel}
            </h2>
            <button onClick={() => viewMode === "month" ? navigateMonth(1) : navigateWeek(1)} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Næste">›</button>
            <button onClick={goToToday} className="text-xs text-blue-600 hover:underline ml-1">I dag</button>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
              {(["month", "week"] as ViewMode[]).map((m) => (
                <button key={m} onClick={() => setViewMode(m)} className={cn("px-3 py-1.5 rounded-md font-medium transition-colors", viewMode === m ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                  {m === "month" ? "Måned" : "Uge"}
                </button>
              ))}
            </div>
            {/* Personal filter */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
              {([{ value: "all", label: "Alle" }, { value: "dept", label: "Min afdeling" }, { value: "me", label: "Kun mig" }] as { value: PersonalFilter; label: string }[]).map((opt) => (
                <button key={opt.value} onClick={() => setPersonalFilter(opt.value)} className={cn("px-3 py-1.5 rounded-md font-medium transition-colors", personalFilter === opt.value ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Print button */}
            <a
              href={`/manager/calendar/print?year=${year}&month=${month}&scope=${personalFilter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Print kalender"
            >
              🖨️ Print
            </a>
          </div>
        </div>

        {/* Toolbar row 2: dept chips + legend */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-3">
            {departments.map((dept) => {
              const color = deptColorMap.get(dept.id);
              return (
                <span key={dept.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color?.hex ?? "#64748b" }} aria-hidden="true" />
                  {dept.name}
                </span>
              );
            })}
          </div>
          <div className="flex gap-3">
            <LegendItem hex="#fef08a" label="Afventer" />
            <LegendItem hex="#fee2e2" label="Helligdag" />
            <LegendItem hex="#f3f4f6" label="Weekend" />
          </div>
        </div>

        {/* Grid */}
        <div ref={scrollRef} className="overflow-auto border border-gray-200 rounded-xl shadow-sm" style={{ maxHeight: "calc(100vh - 220px)" }}>
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
    </div>
  );
}
