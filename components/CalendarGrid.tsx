"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, isWeekend } from "date-fns";
import { da } from "date-fns/locale";
import { getMonthDays, formatMonthYear, cn, STATUS_LABELS, ENTRY_TYPE_LABELS, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarUser {
  id: string;
  name: string;
}

interface CalendarDepartment {
  id: string;
  name: string;
  maxConcurrent: number;
  users: CalendarUser[];
}

interface CalendarEntry {
  date: string;
  type: string;
  days: number;
}

interface CalendarRequest {
  id: string;
  status: "APPROVED" | "PENDING";
  note: string | null;
  user: { id: string; name: string };
  entries: CalendarEntry[];
}

interface CalendarHoliday {
  id: string;
  name: string;
  date: string;
  isNational: boolean;
}

interface CellModalData {
  dateKey: string;
  user: CalendarUser;
  requests: CalendarRequest[];
  holidayName: string | null;
}

export interface CalendarGridProps {
  year: number;
  month: number;
  departments: CalendarDepartment[];
  requests: CalendarRequest[];
  holidays: CalendarHoliday[];
}

// ─── Cell colour logic ────────────────────────────────────────────────────────

function getCellStyle(
  hasApproved: boolean,
  hasPending: boolean,
  isHolidayDay: boolean,
  isWeekendDay: boolean
): string {
  if (hasApproved) return "bg-green-200 hover:bg-green-300";
  if (hasPending)  return "bg-yellow-200 hover:bg-yellow-300";
  if (isHolidayDay) return "bg-red-50";
  if (isWeekendDay) return "bg-gray-100";
  return "hover:bg-blue-50";
}

function getCellContent(
  hasApproved: boolean,
  hasPending: boolean,
  entry: CalendarEntry | undefined
): React.ReactNode {
  if (!hasApproved && !hasPending) return null;
  const isHalf = entry && entry.days === 0.5;
  if (hasApproved) return (
    <span className={cn("text-green-700 font-bold leading-none", isHalf ? "text-[9px]" : "text-[11px]")}>
      {isHalf ? "½" : "✓"}
    </span>
  );
  return (
    <span className="text-yellow-700 font-bold text-[11px] leading-none">?</span>
  );
}

// ─── Cell detail modal ────────────────────────────────────────────────────────

function CellDetailModal({
  data,
  onClose,
}: {
  data: CellModalData | null;
  onClose: () => void;
}) {
  if (!data) return null;

  const { dateKey, user, requests, holidayName } = data;
  const displayDate = formatDate(dateKey);

  return (
    <Modal
      open={!!data}
      onClose={onClose}
      title={`${user.name} · ${displayDate}`}
      className="max-w-md"
    >
      <div className="space-y-4">
        {holidayName && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-700">
            🎌 {holidayName}
          </div>
        )}

        {requests.length === 0 && (
          <p className="text-sm text-gray-500">Ingen ansøgning denne dag.</p>
        )}

        {requests.map((req) => {
          const dayEntry = req.entries.find(
            (e) => new Date(e.date).toISOString().slice(0, 10) === dateKey
          );
          const totalDays = req.entries.reduce((s, e) => s + e.days, 0);

          return (
            <div key={req.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <StatusBadge status={req.status} />
                <span className="text-xs text-gray-400">
                  {totalDays} dag{totalDays !== 1 ? "e" : ""} samlet
                </span>
              </div>

              {dayEntry && (
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Denne dag: </span>
                  {ENTRY_TYPE_LABELS[dayEntry.type] ?? dayEntry.type}
                  {dayEntry.days === 0.5 && (
                    <span className="ml-1 text-gray-500">(½ dag)</span>
                  )}
                </div>
              )}

              {req.note && (
                <p className="text-xs text-gray-500 italic bg-gray-50 rounded px-2 py-1">
                  "{req.note}"
                </p>
              )}

              <div className="pt-1 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Alle datoer i denne ansøgning</p>
                <div className="flex flex-wrap gap-1">
                  {[...req.entries]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((e) => {
                      const eKey = new Date(e.date).toISOString().slice(0, 10);
                      return (
                        <span
                          key={eKey}
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            eKey === dateKey
                              ? "bg-blue-100 text-blue-700 font-semibold"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {format(new Date(e.date), "d/M")}
                          {e.days === 0.5 && "½"}
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

function CapacityDot({
  count,
  max,
}: {
  count: number;
  max: number;
}) {
  if (count === 0) return null;
  const exceeded = count > max;
  return (
    <div
      title={`${count}/${max} godkendt`}
      className={cn(
        "text-[9px] font-bold leading-none text-center",
        exceeded ? "text-red-600" : "text-gray-400"
      )}
    >
      {count}/{max}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarGrid({
  year,
  month,
  departments,
  requests,
  holidays,
}: CalendarGridProps) {
  const router = useRouter();
  const [cellModal, setCellModal] = useState<CellModalData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = getMonthDays(year, month);

  // Holiday lookup: dateKey -> name
  const holidayMap = new Map<string, string>(
    holidays.map((h) => [new Date(h.date).toISOString().slice(0, 10), h.name])
  );

  // Request lookup: userId -> dateKey -> requests[]
  const requestLookup = new Map<string, Map<string, CalendarRequest[]>>();
  for (const req of requests) {
    for (const entry of req.entries) {
      const dk = new Date(entry.date).toISOString().slice(0, 10);
      if (!requestLookup.has(req.user.id)) requestLookup.set(req.user.id, new Map());
      const dm = requestLookup.get(req.user.id)!;
      if (!dm.has(dk)) dm.set(dk, []);
      dm.get(dk)!.push(req);
    }
  }

  // Approved count per dept per date: deptId -> dateKey -> count
  const deptCapacity = new Map<string, Map<string, number>>();
  for (const dept of departments) {
    const dm = new Map<string, number>();
    for (const req of requests) {
      if (req.status !== "APPROVED") continue;
      const userInDept = dept.users.some((u) => u.id === req.user.id);
      if (!userInDept) continue;
      for (const entry of req.entries) {
        const dk = new Date(entry.date).toISOString().slice(0, 10);
        dm.set(dk, (dm.get(dk) ?? 0) + 1);
      }
    }
    deptCapacity.set(dept.id, dm);
  }

  function navigate(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    router.push(`/manager/calendar?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
  }

  function openCell(dateKey: string, user: CalendarUser, reqs: CalendarRequest[]) {
    setCellModal({
      dateKey,
      user,
      requests: reqs,
      holidayName: holidayMap.get(dateKey) ?? null,
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ‹
          </button>
          <h2 className="text-xl font-bold text-gray-900 capitalize min-w-[160px] text-center">
            {formatMonthYear(year, month)}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ›
          </button>
          <button
            onClick={() => {
              const n = new Date();
              router.push(`/manager/calendar?year=${n.getFullYear()}&month=${n.getMonth() + 1}`);
            }}
            className="text-xs text-blue-600 hover:underline ml-1"
          >
            I dag
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-gray-500">
          <LegendItem color="bg-green-200" label="Godkendt" />
          <LegendItem color="bg-yellow-200" label="Afventer" />
          <LegendItem color="bg-red-100" label="Helligdag" />
          <LegendItem color="bg-gray-200" label="Weekend" />
        </div>
      </div>

      {/* ── Grid ── */}
      <div
        ref={scrollRef}
        className="overflow-auto border border-gray-200 rounded-xl shadow-sm"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        <table className="border-collapse text-xs" style={{ minWidth: "max-content" }}>
          {/* ── Sticky thead ── */}
          <thead className="sticky top-0 z-20">
            <tr>
              {/* Corner cell */}
              <th
                className="sticky left-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-gray-500 font-semibold min-w-[160px] whitespace-nowrap"
                style={{ minWidth: 160 }}
              >
                Medarbejder
              </th>

              {days.map((d) => {
                const dk = format(d, "yyyy-MM-dd");
                const holiday = holidayMap.get(dk);
                const weekend = isWeekend(d);
                const isToday = dk === format(new Date(), "yyyy-MM-dd");

                return (
                  <th
                    key={dk}
                    title={holiday ?? undefined}
                    className={cn(
                      "border-b border-r border-gray-200 text-center font-normal select-none",
                      "min-w-[32px] w-8 py-1.5 px-0",
                      weekend && !holiday ? "bg-gray-100 text-gray-400" : "",
                      holiday ? "bg-red-100 text-red-700" : "",
                      !weekend && !holiday ? "bg-gray-50 text-gray-600" : "",
                      isToday ? "ring-2 ring-inset ring-blue-400" : ""
                    )}
                  >
                    <div className="font-semibold text-[11px]">{format(d, "d")}</div>
                    <div className="text-[9px] uppercase opacity-60">
                      {format(d, "EEEEE", { locale: da })}
                    </div>
                    {holiday && (
                      <div className="text-[8px] text-red-500 leading-tight px-0.5 truncate max-w-[30px]" title={holiday}>
                        🎌
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {departments.map((dept) => {
              const capacityMap = deptCapacity.get(dept.id)!;

              return (
                <>
                  {/* ── Department row ── */}
                  <tr key={`dept-${dept.id}`}>
                    <td
                      className="sticky left-0 z-10 bg-slate-700 text-white px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wide whitespace-nowrap border-b border-slate-600"
                      style={{ minWidth: 160 }}
                    >
                      {dept.name}
                    </td>
                    {days.map((d) => {
                      const dk = format(d, "yyyy-MM-dd");
                      const count = capacityMap.get(dk) ?? 0;
                      const weekend = isWeekend(d);
                      const holiday = holidayMap.has(dk);

                      return (
                        <td
                          key={dk}
                          className={cn(
                            "border-b border-r border-slate-600 text-center py-0.5",
                            weekend || holiday ? "bg-slate-600" : "bg-slate-700"
                          )}
                        >
                          <CapacityDot count={count} max={dept.maxConcurrent} />
                        </td>
                      );
                    })}
                  </tr>

                  {/* ── Employee rows ── */}
                  {dept.users.map((emp, empIdx) => (
                    <tr
                      key={emp.id}
                      className={cn(
                        "group transition-colors",
                        empIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      )}
                    >
                      {/* Sticky name cell */}
                      <td
                        className={cn(
                          "sticky left-0 z-10 border-b border-r border-gray-200 px-3 py-1.5 whitespace-nowrap font-medium text-gray-800 text-[12px]",
                          empIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        )}
                        style={{ minWidth: 160 }}
                      >
                        {emp.name}
                      </td>

                      {days.map((d) => {
                        const dk = format(d, "yyyy-MM-dd");
                        const reqs = requestLookup.get(emp.id)?.get(dk) ?? [];
                        const weekend = isWeekend(d);
                        const holiday = holidayMap.has(dk);
                        const hasApproved = reqs.some((r) => r.status === "APPROVED");
                        const hasPending = reqs.some((r) => r.status === "PENDING");
                        const approvedEntry = reqs
                          .find((r) => r.status === "APPROVED")
                          ?.entries.find(
                            (e) => new Date(e.date).toISOString().slice(0, 10) === dk
                          );
                        const clickable = reqs.length > 0 || holiday;

                        return (
                          <td
                            key={dk}
                            onClick={() =>
                              clickable && openCell(dk, emp, reqs)
                            }
                            className={cn(
                              "border-b border-r border-gray-100 text-center transition-colors",
                              "h-7 w-8",
                              getCellStyle(hasApproved, hasPending, holiday, weekend),
                              clickable ? "cursor-pointer" : "cursor-default"
                            )}
                          >
                            {getCellContent(hasApproved, hasPending, approvedEntry)}
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
      </div>

      {/* ── Cell detail modal ── */}
      <CellDetailModal
        data={cellModal}
        onClose={() => setCellModal(null)}
      />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("w-3 h-3 rounded-sm inline-block border border-gray-200", color)} />
      {label}
    </span>
  );
}
