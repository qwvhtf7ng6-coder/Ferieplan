"use client";

import { useMemo } from "react";
import { format, isWeekend, getDaysInMonth } from "date-fns";
import { da } from "date-fns/locale";
import { formatMonthYear, cn, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/lib/utils";
import { buildDeptColorMap } from "@/lib/dept-colors";

interface PrintDept {
  id: string;
  name: string;
  maxConcurrent: number;
  shiftsEnabled: boolean;
  users: { id: string; name: string }[];
}

interface PrintRequest {
  id: string;
  status: string;
  note: string | null;
  user: { id: string; name: string };
  entries: { date: string; type: string; absenceType: string; days: number }[];
}

interface PrintHoliday {
  id: string;
  name: string;
  date: string;
  isNational: boolean;
}

interface PrintCalendarViewProps {
  year: number;
  month: number;
  departments: PrintDept[];
  requests: PrintRequest[];
  holidays: PrintHoliday[];
  isManagerOrAdmin: boolean;
}

export function PrintCalendarView({
  year, month, departments, requests, holidays, isManagerOrAdmin,
}: PrintCalendarViewProps) {
  const deptColorMap = useMemo(() => buildDeptColorMap(departments.map((d) => d.id)), [departments]);

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1));

  const holidayMap = useMemo(
    () => new Map(holidays.map((h) => [new Date(h.date).toISOString().slice(0, 10), h.name])),
    [holidays],
  );

  const requestLookup = useMemo(() => {
    const map = new Map<string, Map<string, PrintRequest[]>>();
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

  const todayKey = format(new Date(), "yyyy-MM-dd");

  return (
    <div
      id="calendar-print-view"
      style={{
        display: "none",
        fontFamily: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
        background: "#fff",
        color: "#111827",
        padding: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "2px solid #e2e8f0", paddingBottom: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
            📅 WorkPlan — Kalender
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, textTransform: "capitalize" }}>
            {formatMonthYear(year, month)}
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af" }}>
          Udskrevet {format(new Date(), "d. MMM yyyy", { locale: da })}
        </div>
      </div>

      {/* Holidays row */}
      {holidays.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8, fontSize: 10, color: "#991b1b" }}>
          {holidays.map((h) => (
            <span key={h.id}>🎌 {h.name} ({format(new Date(h.date), "d. MMM", { locale: da })})</span>
          ))}
        </div>
      )}

      {/* Grid */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 10, width: "100%", minWidth: "max-content" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #e2e8f0", background: "#f8fafc", padding: "4px 8px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap", minWidth: 140, fontSize: 10, color: "#374151" }}>
                Medarbejder
              </th>
              {days.map((d) => {
                const dk = format(d, "yyyy-MM-dd");
                const weekend = isWeekend(d);
                const holiday = holidayMap.has(dk);
                const isToday = dk === todayKey;
                return (
                  <th key={dk} title={holidayMap.get(dk)}
                    style={{
                      border: "1px solid #e2e8f0",
                      textAlign: "center",
                      width: 28,
                      padding: "2px 0",
                      background: holiday ? "#fee2e2" : weekend ? "#f3f4f6" : isToday ? "#eef2ff" : "#f8fafc",
                      color: holiday ? "#991b1b" : weekend ? "#9ca3af" : isToday ? "#4f46e5" : "#374151",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 10 }}>{format(d, "d")}</div>
                    <div style={{ fontSize: 8, textTransform: "uppercase", opacity: 0.7 }}>{format(d, "EEEEE", { locale: da })}</div>
                    {holiday && <div style={{ fontSize: 7 }}>🎌</div>}
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
                  {/* Dept row */}
                  <tr key={`dept-${dept.id}`}>
                    <td style={{ border: "1px solid #e2e8f0", padding: "3px 8px", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "#fff", background: color?.hex ?? "#334155", minWidth: 140 }}>
                      {dept.name}
                    </td>
                    {days.map((d) => (
                      <td key={format(d, "yyyy-MM-dd")} style={{ border: "1px solid #e2e8f0", background: color?.hex ? `${color.hex}99` : "#33415566" }} />
                    ))}
                  </tr>

                  {/* Employee rows */}
                  {dept.users.map((emp, empIdx) => (
                    <tr key={emp.id} style={{ background: empIdx % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                      <td style={{ border: "1px solid #e2e8f0", padding: "2px 8px", fontWeight: 500, whiteSpace: "nowrap", fontSize: 10, color: "#111827", background: empIdx % 2 === 0 ? "#ffffff" : "#f9fafb", minWidth: 140 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: color?.hexDot ?? "#64748b", flexShrink: 0 }} />
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

                        const entry = approved?.entries.find((e) => new Date(e.date).toISOString().slice(0, 10) === dk);
                        const absColor = entry ? ABSENCE_TYPE_COLORS[entry.absenceType] : null;

                        let bg = "transparent";
                        if (approved && entry) bg = absColor?.bg ?? color?.hexLight ?? "#dcfce7";
                        else if (pending) bg = "#fef3c7";
                        else if (holiday) bg = "#fee2e2";
                        else if (weekend) bg = "#f3f4f6";

                        return (
                          <td key={dk}
                            style={{ border: "1px solid #e2e8f0", textAlign: "center", height: 22, background: bg }}
                            title={entry ? (ABSENCE_TYPE_LABELS[entry.absenceType] ?? "") : undefined}
                          >
                            {approved && (
                              <span style={{ fontWeight: 700, fontSize: entry?.days === 0.5 ? 8 : 10, color: color?.hexDot ?? "#334155" }}>
                                {entry?.days === 0.5 ? "½" : "✓"}
                              </span>
                            )}
                            {!approved && pending && (
                              <span style={{ fontWeight: 700, fontSize: 9, color: "#d97706" }}>?</span>
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

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap", fontSize: 9, color: "#374151" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#fef3c7", border: "1px solid #e2e8f0" }} /> Afventer
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#fee2e2", border: "1px solid #e2e8f0" }} /> Helligdag
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#f3f4f6", border: "1px solid #e2e8f0" }} /> Weekend
        </span>
      </div>
    </div>
  );
}
