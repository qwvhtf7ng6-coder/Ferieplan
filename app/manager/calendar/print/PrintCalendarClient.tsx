"use client";
import { toISODate } from "@/lib/utils";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, isWeekend, getDaysInMonth } from "date-fns";
import { da } from "date-fns/locale";
import { cn, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS, formatMonthYear } from "@/lib/utils";
import { buildDeptColorMap } from "@/lib/dept-colors";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Dept { id: string; name: string; maxConcurrent: number; users: { id: string; name: string }[]; }
interface PrintRequest {
  id: string; status: string; note: string | null;
  user: { id: string; name: string };
  departmentId: string;
  department: { id: string; name: string };
  entries: { date: string; type: string; absenceType: string; days: number }[];
}
interface Holiday { id: string; name: string; date: string; isNational: boolean; }

interface Props {
  year: number; month: number; scope: string;
  departments: Dept[];
  requests: PrintRequest[];
  holidays: Holiday[];
  currentUserId: string;
  currentUserDeptId: string | null;
  currentUserName: string;
  isManagerOrAdmin: boolean;
}

type Scope = "all" | "dept" | "me" | string; // string = specific deptId

const MONTHS = ["Januar","Februar","Marts","April","Maj","Juni","Juli","August","September","Oktober","November","December"];

function formatDK(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getFullYear()}`;
}

// ─── Print grid ───────────────────────────────────────────────────────────────

function PrintGrid({
  year, month, departments, requests, holidays, deptColorMap, isManagerOrAdmin,
}: {
  year: number; month: number;
  departments: Dept[]; requests: PrintRequest[]; holidays: Holiday[];
  deptColorMap: ReturnType<typeof buildDeptColorMap>;
  isManagerOrAdmin: boolean;
}) {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1));

  const holidayMap = useMemo(() => new Map(
    holidays.map((h) => [toISODate(h.date), h.name])
  ), [holidays]);

  const requestLookup = useMemo(() => {
    const map = new Map<string, Map<string, PrintRequest[]>>();
    for (const req of requests) {
      for (const entry of req.entries) {
        const dk = toISODate(entry.date);
        if (!map.has(req.user.id)) map.set(req.user.id, new Map());
        const dm = map.get(req.user.id)!;
        if (!dm.has(dk)) dm.set(dk, []);
        dm.get(dk)!.push(req);
      }
    }
    return map;
  }, [requests]);

  const todayKey = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[10px] w-full" style={{ minWidth: "max-content" }}>
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold text-gray-700 whitespace-nowrap sticky left-0" style={{ minWidth: 140 }}>
              Medarbejder
            </th>
            {days.map((d) => {
              const dk = format(d, "yyyy-MM-dd");
              const weekend = isWeekend(d);
              const holiday = holidayMap.has(dk);
              const isToday = dk === todayKey;
              return (
                <th
                  key={dk}
                  title={holidayMap.get(dk)}
                  className={cn(
                    "border border-gray-300 text-center font-normal w-7 py-1 px-0",
                    weekend ? "bg-gray-200 text-gray-500" : "bg-gray-50 text-gray-700",
                    holiday ? "bg-red-100 text-red-700" : "",
                    isToday ? "bg-blue-100" : "",
                  )}
                >
                  <div className="font-bold text-[10px]">{format(d, "d")}</div>
                  <div className="text-[8px] uppercase opacity-60">{format(d, "EEEEE", { locale: da })}</div>
                  {holiday && <div className="text-[7px]">🎌</div>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => {
            const color = deptColorMap.get(dept.id);
            return (
              <>
                {/* Dept header */}
                <tr key={`dept-${dept.id}`}>
                  <td
                    className="border border-gray-300 px-2 py-1 font-bold text-[10px] uppercase tracking-wide text-white sticky left-0"
                    style={{ backgroundColor: color?.hex ?? "#334155", minWidth: 140 }}
                    colSpan={1}
                  >
                    {dept.name}
                  </td>
                  {days.map((d) => (
                    <td
                      key={format(d, "yyyy-MM-dd")}
                      className="border border-gray-300"
                      style={{ backgroundColor: color?.hex ?? "#334155", opacity: 0.7 }}
                    />
                  ))}
                </tr>

                {/* Employee rows */}
                {dept.users.map((emp, empIdx) => (
                  <tr key={emp.id} className={empIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td
                      className={cn("border border-gray-300 px-2 py-1 font-medium text-gray-800 whitespace-nowrap sticky left-0", empIdx % 2 === 0 ? "bg-white" : "bg-gray-50")}
                      style={{ minWidth: 140 }}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 print:hidden" style={{ backgroundColor: color?.hexDot }} />
                        {emp.name}
                      </span>
                    </td>
                    {days.map((d) => {
                      const dk = format(d, "yyyy-MM-dd");
                      const reqs = requestLookup.get(emp.id)?.get(dk) ?? [];
                      const approved = reqs.find((r) => r.status === "APPROVED");
                      const pending = reqs.find((r) => r.status === "PENDING") && isManagerOrAdmin;
                      const weekend = isWeekend(d);
                      const holiday = holidayMap.has(dk);

                      const entry = approved?.entries.find((e) => toISODate(e.date) === dk);
                      const absColor = entry ? ABSENCE_TYPE_COLORS[entry.absenceType] : null;
                      const absLabel = entry ? ABSENCE_TYPE_LABELS[entry.absenceType] : null;

                      let cellStyle: React.CSSProperties = {};
                      let cellClass = "border border-gray-200 text-center h-6";

                      if (approved && entry) {
                        cellStyle = { backgroundColor: absColor?.bg ?? color?.hexLight ?? "#dcfce7" };
                      } else if (pending) {
                        cellClass += " bg-yellow-100";
                      } else if (holiday) {
                        cellClass += " bg-red-50";
                      } else if (weekend) {
                        cellClass += " bg-gray-100";
                      }

                      return (
                        <td key={dk} className={cellClass} style={cellStyle} title={absLabel ?? undefined}>
                          {approved && (
                            <span className="font-bold text-[9px] text-gray-700 leading-none">
                              {entry?.days === 0.5 ? "½" : "✓"}
                            </span>
                          )}
                          {!approved && pending && (
                            <span className="font-bold text-[9px] text-yellow-700">?</span>
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
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function PrintCalendarClient({
  year, month, scope: initialScope,
  departments, requests, holidays,
  currentUserId, currentUserDeptId, currentUserName,
  isManagerOrAdmin,
}: Props) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>(initialScope);
  const [autoPrint, setAutoPrint] = useState(false);

  // Auto-print when navigated with ?print=1
  useEffect(() => {
    if (autoPrint) {
      window.print();
      setAutoPrint(false);
    }
  }, [autoPrint]);

  const deptColorMap = useMemo(() => buildDeptColorMap(departments.map((d) => d.id)), [departments]);

  // Filter departments + requests by scope
  const filteredDepts = useMemo(() => {
    if (scope === "all") return departments;
    if (scope === "me") return departments.map((d) => ({ ...d, users: d.users.filter((u) => u.id === currentUserId) })).filter((d) => d.users.length > 0);
    if (scope === "dept") return departments.map((d) => ({ ...d, users: d.id === currentUserDeptId ? d.users : [] })).filter((d) => d.users.length > 0);
    // specific deptId
    return departments.map((d) => ({ ...d, users: d.id === scope ? d.users : [] })).filter((d) => d.users.length > 0);
  }, [departments, scope, currentUserId, currentUserDeptId]);

  const filteredRequests = useMemo(() => {
    const visibleUserIds = new Set(filteredDepts.flatMap((d) => d.users.map((u) => u.id)));
    return requests.filter((r) => visibleUserIds.has(r.user.id));
  }, [filteredDepts, requests]);

  const scopeLabel = useMemo(() => {
    if (scope === "all") return "Alle medarbejdere";
    if (scope === "me") return `Kun mig (${currentUserName})`;
    if (scope === "dept") {
      const d = departments.find((d) => d.id === currentUserDeptId);
      return `Min afdeling${d ? `: ${d.name}` : ""}`;
    }
    const d = departments.find((d) => d.id === scope);
    return d ? `Afdeling: ${d.name}` : scope;
  }, [scope, departments, currentUserId, currentUserDeptId, currentUserName]);

  const monthName = `${MONTHS[month - 1]} ${year}`;

  return (
    <>
      {/* ── Print settings panel (hidden on print) ── */}
      <div className="print:hidden bg-white border-b border-gray-200 px-4 py-4 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Vis</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "all",  label: "Alle medarbejdere" },
              { value: "dept", label: "Min afdeling" },
              { value: "me",   label: "Kun mig" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setScope(opt.value as Scope)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  scope === opt.value
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Tilbage
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* ── Printable area ── */}
      <div className="p-4 print:p-0">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 print:text-base">
              Feriekalender — {monthName}
            </h1>
            <p className="text-sm text-gray-500 print:text-xs">{scopeLabel}</p>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 print:text-[9px]">
            {Object.entries(ABSENCE_TYPE_LABELS).map(([key, label]) => {
              const c = ABSENCE_TYPE_COLORS[key];
              return (
                <span key={key} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm border border-gray-200 inline-block" style={{ backgroundColor: c?.bg }} />
                  {label}
                </span>
              );
            })}
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-200 inline-block" />
              Weekend
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-red-100 border border-gray-200 inline-block" />
              Helligdag
            </span>
          </div>
        </div>

        {/* Holidays */}
        {holidays.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 print:text-[9px]">
            {holidays.map((h) => (
              <span key={h.id} className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-2 py-0.5">
                🎌 {h.name} ({formatDK(h.date)})
              </span>
            ))}
          </div>
        )}

        {/* Grid */}
        <PrintGrid
          year={year} month={month}
          departments={filteredDepts}
          requests={filteredRequests}
          holidays={holidays}
          deptColorMap={deptColorMap}
          isManagerOrAdmin={isManagerOrAdmin}
        />

        {/* Print footer */}
        <div className="hidden print:block mt-4 text-[8px] text-gray-400 border-t border-gray-200 pt-2 flex justify-between">
          <span>WorkPlan — udskrevet {new Date().toLocaleDateString("da-DK")}</span>
          <span>{scopeLabel}</span>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block  { display: block  !important; }
          .print\\:p-0    { padding: 0 !important; }
          .print\\:text-base  { font-size: 12pt !important; }
          .print\\:text-xs   { font-size: 8pt  !important; }
          .print\\:text-\\[9px\\] { font-size: 7pt !important; }
        }
      `}</style>
    </>
  );
}
