"use client";

import { useMemo } from "react";
import { format, isWeekend, getDaysInMonth } from "date-fns";
import { da } from "date-fns/locale";
import { ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/lib/utils";
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
  /** Explicit list of days to print — matches whatever is on screen (month or week) */
  days?: Date[];
  /** Display title override — e.g. "Uge 21 · 19.–25. maj 2026" */
  printTitle?: string;
  departments: PrintDept[];
  requests: PrintRequest[];
  holidays: PrintHoliday[];
  isManagerOrAdmin: boolean;
}

const MONTH_NAMES = [
  "Januar","Februar","Marts","April","Maj","Juni",
  "Juli","August","September","Oktober","November","December",
];

const DAY_INITIALS = ["M","T","O","T","F","L","S"];

export function PrintCalendarView({
  year, month, days: daysProp, printTitle,
  departments, requests, holidays, isManagerOrAdmin,
}: PrintCalendarViewProps) {
  const deptColorMap = useMemo(() => buildDeptColorMap(departments.map((d) => d.id)), [departments]);

  const monthDaysList = Array.from(
    { length: getDaysInMonth(new Date(year, month - 1)) },
    (_, i) => new Date(year, month - 1, i + 1),
  );
  const days = daysProp ?? monthDaysList;
  const daysInMonth = days.length;

  const holidayMap = useMemo(
    () => new Map(holidays.map((h) => [h.date.substring(0, 10), h.name])),
    [holidays],
  );

  const requestLookup = useMemo(() => {
    const map = new Map<string, Map<string, PrintRequest[]>>();
    for (const req of requests) {
      for (const entry of req.entries) {
        const dk = entry.date.substring(0, 10);
        if (!map.has(req.user.id)) map.set(req.user.id, new Map());
        const dm = map.get(req.user.id)!;
        if (!dm.has(dk)) dm.set(dk, []);
        dm.get(dk)!.push(req);
      }
    }
    return map;
  }, [requests]);

  const today = new Date();
  const todayKey = format(today, "yyyy-MM-dd");

  // Collect all absence types used this month for the legend
  const usedAbsenceTypes = useMemo(() => {
    const types = new Set<string>();
    for (const req of requests) {
      if (req.status === "APPROVED") {
        for (const e of req.entries) types.add(e.absenceType);
      }
    }
    return [...types];
  }, [requests]);

  const totalEmployees = departments.reduce((s, d) => s + d.users.length, 0);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    page: {
      display: "none",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      background: "#fff",
      color: "#111",
      padding: "0",
    } as React.CSSProperties,

    headerWrap: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      borderBottom: "2px solid #1e3a5f",
      paddingBottom: "8px",
      marginBottom: "14px",
    } as React.CSSProperties,

    title: { fontSize: "20px", fontWeight: 800, color: "#1e3a5f", letterSpacing: "-0.3px" } as React.CSSProperties,
    subtitle: { fontSize: "12px", color: "#555", marginTop: "2px" } as React.CSSProperties,
    metaRight: { textAlign: "right" } as React.CSSProperties,
    metaPrimary: { fontSize: "15px", fontWeight: 700, color: "#1e3a5f" } as React.CSSProperties,
    metaSub: { fontSize: "11px", color: "#666" } as React.CSSProperties,
    metaFaint: { fontSize: "10px", color: "#aaa", marginTop: "2px" } as React.CSSProperties,

    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: "10px",
      tableLayout: "fixed" as const,
    } as React.CSSProperties,

    thName: {
      background: "#1e3a5f",
      color: "#fff",
      padding: "6px 8px",
      textAlign: "left" as const,
      fontWeight: 700,
      fontSize: "9px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
      borderRadius: "4px 0 0 0",
      width: "130px",
    } as React.CSSProperties,

    sectionLabel: {
      fontSize: "9px",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.6px",
      color: "#64748b",
      marginBottom: "6px",
    } as React.CSSProperties,

    legendRow: {
      marginTop: "14px",
      borderTop: "1px solid #e2e8f0",
      paddingTop: "10px",
    } as React.CSSProperties,

    footer: {
      marginTop: "10px",
      display: "flex",
      justifyContent: "space-between",
      fontSize: "9px",
      color: "#cbd5e1",
      borderTop: "1px solid #f1f5f9",
      paddingTop: "6px",
    } as React.CSSProperties,
  };

  return (
    <div id="calendar-print-view" style={S.page}>

      {/* ── Page header ── */}
      <div style={S.headerWrap}>
        <div>
          <div style={S.title}>WorkPlan — Kalender</div>
          <div style={S.subtitle}>
            {printTitle ?? `${MONTH_NAMES[month - 1]} ${year}`}
            {departments.length === 1 && ` · ${departments[0].name}`}
          </div>
        </div>
        <div style={S.metaRight}>
          <div style={S.metaPrimary}>{printTitle ?? `${MONTH_NAMES[month - 1]} ${year}`}</div>
          <div style={S.metaSub}>{daysInMonth} dage · {totalEmployees} medarbejdere</div>
          <div style={S.metaFaint}>Udskrevet {format(today, "d. MMM yyyy", { locale: da })}</div>
        </div>
      </div>

      {/* ── Holiday banner ── */}
      {holidays.length > 0 && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "10px",
          padding: "6px 10px",
          background: "#fef2f2",
          borderRadius: "4px",
          border: "1px solid #fecaca",
        }}>
          <span style={{ fontSize: "9px", fontWeight: 700, color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center" }}>
            Helligdage:
          </span>
          {holidays.map((h) => (
            <span key={h.id} style={{ fontSize: "10px", color: "#7f1d1d", display: "flex", alignItems: "center", gap: "4px" }}>
              🎌 <strong>{h.name}</strong>
              <span style={{ color: "#b91c1c", fontWeight: 400 }}>
                ({format(new Date(h.date), "d. MMM", { locale: da })})
              </span>
            </span>
          ))}
        </div>
      )}

      {/* ── Calendar table ── */}
      <table style={S.table}>
        <colgroup>
          <col style={{ width: "130px" }} />
          {days.map((_, i) => (
            <col key={i} style={{ width: `${(100 - 14) / daysInMonth}%` }} />
          ))}
        </colgroup>

        <thead>
          <tr>
            <th style={S.thName}>Medarbejder</th>
            {days.map((d, i) => {
              const dk = format(d, "yyyy-MM-dd");
              const weekend = isWeekend(d);
              const holiday = holidayMap.has(dk);
              const isToday = dk === todayKey;
              const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0
              return (
                <th key={dk} title={holidayMap.get(dk)} style={{
                  background: isToday ? "#2563eb" : holiday ? "#dc2626" : weekend ? "#374151" : "#1e3a5f",
                  color: "#fff",
                  padding: "5px 1px",
                  textAlign: "center" as const,
                  fontWeight: 700,
                  borderLeft: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: i === daysInMonth - 1 ? "0 4px 0 0" : undefined,
                }}>
                  <div style={{ fontSize: "9px", opacity: 0.7 }}>{DAY_INITIALS[dayOfWeek]}</div>
                  <div style={{ fontSize: "13px", fontWeight: 800, lineHeight: 1.1 }}>{d.getDate()}</div>
                  {holiday && <div style={{ fontSize: "7px", opacity: 0.9 }}>🎌</div>}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {departments.map((dept) => {
            const color = deptColorMap.get(dept.id);
            const headerBg = color?.hex ?? "#334155";

            return (
              <>
                {/* Dept header row */}
                <tr key={`dept-${dept.id}`}>
                  <td colSpan={daysInMonth + 1} style={{
                    background: headerBg,
                    color: "#fff",
                    padding: "4px 8px",
                    fontWeight: 700,
                    fontSize: "9px",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.8px",
                  }}>
                    {dept.name}
                    <span style={{ fontWeight: 400, opacity: 0.65, marginLeft: "8px", fontSize: "8px" }}>
                      maks. {dept.maxConcurrent} samtidige
                    </span>
                  </td>
                </tr>

                {/* Employee rows */}
                {dept.users.map((emp, empIdx) => {
                  const isEven = empIdx % 2 === 0;
                  return (
                    <tr key={emp.id}>
                      {/* Name */}
                      <td style={{
                        background: isEven ? "#f8fafc" : "#fff",
                        padding: "4px 8px",
                        fontWeight: 600,
                        fontSize: "10px",
                        color: "#1e293b",
                        borderBottom: "1px solid #e2e8f0",
                        borderRight: "1px solid #e2e8f0",
                        verticalAlign: "middle" as const,
                        whiteSpace: "nowrap" as const,
                        overflow: "hidden" as const,
                        textOverflow: "ellipsis" as const,
                      }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <span style={{
                            display: "inline-block",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: color?.hexDot ?? "#64748b",
                            flexShrink: 0,
                          }} />
                          {emp.name}
                        </span>
                      </td>

                      {/* Day cells */}
                      {days.map((d) => {
                        const dk = format(d, "yyyy-MM-dd");
                        const reqs = requestLookup.get(emp.id)?.get(dk) ?? [];
                        const approved = reqs.find((r) => r.status === "APPROVED");
                        const pending = reqs.find((r) => r.status === "PENDING") && isManagerOrAdmin;
                        const weekend = isWeekend(d);
                        const holiday = holidayMap.has(dk);
                        const isToday = dk === todayKey;

                        const entry = approved?.entries.find(
                          (e) => e.date.substring(0, 10) === dk
                        );
                        const absColor = entry ? ABSENCE_TYPE_COLORS[entry.absenceType] : null;

                        let bg = isEven ? "#f8fafc" : "#fff";
                        let mark: React.ReactNode = null;

                        if (approved && entry) {
                          bg = absColor?.bg ?? color?.hexLight ?? "#dcfce7";
                          mark = (
                            <div style={{
                              fontWeight: 800,
                              fontSize: entry.days === 0.5 ? "9px" : "11px",
                              color: color?.hexDot ?? "#334155",
                              lineHeight: 1,
                            }}>
                              {entry.days === 0.5 ? "½" : "✓"}
                            </div>
                          );
                        } else if (pending) {
                          bg = "#fef3c7";
                          mark = <div style={{ fontWeight: 800, fontSize: "10px", color: "#d97706" }}>?</div>;
                        } else if (holiday) {
                          bg = "#fee2e2";
                        } else if (weekend) {
                          bg = "#f1f5f9";
                        } else if (isToday) {
                          bg = "#eff6ff";
                        }

                        return (
                          <td key={dk} style={{
                            background: bg,
                            borderBottom: "1px solid #e2e8f0",
                            borderLeft: "1px solid #e2e8f0",
                            textAlign: "center" as const,
                            verticalAlign: "middle" as const,
                            height: "22px",
                            padding: 0,
                          }}>
                            {mark}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            );
          })}
        </tbody>
      </table>

      {/* ── Legend ── */}
      <div style={S.legendRow}>
        <div style={S.sectionLabel}>Forklaring</div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "16px" }}>

          {/* Absence type legend */}
          {usedAbsenceTypes.map((type) => {
            const ac = ABSENCE_TYPE_COLORS[type];
            return (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#334155" }}>
                <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: ac?.bg ?? "#f3f4f6", border: `1px solid ${ac?.text ?? "#e2e8f0"}`, flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{ABSENCE_TYPE_LABELS[type] ?? type}</span>
                <span style={{ color: "#94a3b8", fontSize: "9px" }}>✓</span>
              </div>
            );
          })}

          {/* Status symbols */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#334155" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "#fef3c7", border: "1px solid #fbbf24", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 800, color: "#d97706" }}>?</div>
            <span style={{ fontWeight: 600 }}>Afventer godkendelse</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#334155" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "#fee2e2", border: "1px solid #fca5a5", flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>Helligdag</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#334155" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "#f1f5f9", border: "1px solid #e2e8f0", flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>Weekend</span>
          </div>

          {/* Department chips */}
          {departments.map((dept) => {
            const color = deptColorMap.get(dept.id);
            return (
              <div key={dept.id} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#334155" }}>
                <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: color?.hex ?? "#334155", flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{dept.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={S.footer}>
        <span>WorkPlan — Intern ferieplanlægning</span>
        <span>
          {totalEmployees} medarbejder{totalEmployees !== 1 ? "e" : ""} · {printTitle ?? `${MONTH_NAMES[month - 1]} ${year}`}
        </span>
      </div>

    </div>
  );
}
