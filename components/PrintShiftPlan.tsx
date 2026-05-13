"use client";

import { format, addDays, isSameDay, parseISO, getISOWeek } from "date-fns";
import { da } from "date-fns/locale";

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

interface Employee {
  id: string;
  name: string;
  departmentId: string | null;
  department: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Props {
  weekStart: Date;
  assignments: ShiftAssignment[];
  employees: Employee[];
  departments: Department[];
  selectedDeptId: string;
  isAdmin: boolean;
}

// Capitalize first letter
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PrintShiftPlan({
  weekStart,
  assignments,
  employees,
  departments,
  selectedDeptId,
  isAdmin,
}: Props) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);
  const weekNumber = getISOWeek(weekStart);

  const deptEmployees = employees.filter(
    (e) => !selectedDeptId || e.departmentId === selectedDeptId
  );

  const deptName = selectedDeptId
    ? departments.find((d) => d.id === selectedDeptId)?.name ?? "Alle afdelinger"
    : "Alle afdelinger";

  function getAssignments(userId: string, date: Date): ShiftAssignment[] {
    return assignments.filter(
      (a) => a.user.id === userId && isSameDay(parseISO(a.date), date)
    );
  }

  // Build legend from templates actually used this week
  const usedTemplates = new Map<string, ShiftTemplate>();
  for (const a of assignments) {
    if (!usedTemplates.has(a.template.id)) {
      usedTemplates.set(a.template.id, a.template);
    }
  }
  const legendItems = Array.from(usedTemplates.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "da")
  );

  // Day column header styles
  const dayNames = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

  const today = new Date();

  return (
    <div
      id="shift-print-view"
      style={{
        display: "none",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: "#fff",
        color: "#111",
        padding: "0",
      }}
    >
      {/* ── Page header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderBottom: "2px solid #1e3a5f",
          paddingBottom: "8px",
          marginBottom: "14px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#1e3a5f",
              letterSpacing: "-0.3px",
            }}
          >
            WorkPlan — Vagtplan
          </div>
          <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>
            {deptName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#1e3a5f",
            }}
          >
            Uge {weekNumber}
          </div>
          <div style={{ fontSize: "11px", color: "#666" }}>
            {format(weekStart, "d. MMMM", { locale: da })} –{" "}
            {format(weekEnd, "d. MMMM yyyy", { locale: da })}
          </div>
          <div style={{ fontSize: "10px", color: "#aaa", marginTop: "2px" }}>
            Udskrevet {format(today, "d. MMM yyyy", { locale: da })}
          </div>
        </div>
      </div>

      {/* ── Calendar table ── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "11px",
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          {/* Name column */}
          <col style={{ width: "14%" }} />
          {/* 7 day columns */}
          {weekDays.map((_, i) => (
            <col key={i} style={{ width: `${86 / 7}%` }} />
          ))}
        </colgroup>

        <thead>
          <tr>
            <th
              style={{
                background: "#1e3a5f",
                color: "#fff",
                padding: "7px 10px",
                textAlign: "left",
                fontWeight: 700,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                borderRadius: "4px 0 0 0",
              }}
            >
              Medarbejder
            </th>
            {weekDays.map((day, i) => {
              const isWeekend = i >= 5;
              const isToday = isSameDay(day, today);
              return (
                <th
                  key={day.toISOString()}
                  style={{
                    background: isToday
                      ? "#2563eb"
                      : isWeekend
                      ? "#374151"
                      : "#1e3a5f",
                    color: "#fff",
                    padding: "7px 4px",
                    textAlign: "center",
                    fontWeight: 700,
                    borderLeft: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: i === 6 ? "0 4px 0 0" : undefined,
                  }}
                >
                  <div style={{ fontSize: "10px", opacity: 0.75 }}>
                    {dayNames[i]}
                  </div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      lineHeight: 1.1,
                    }}
                  >
                    {format(day, "d")}
                  </div>
                  <div style={{ fontSize: "9px", opacity: 0.65 }}>
                    {format(day, "MMM", { locale: da })}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {deptEmployees.length === 0 && (
            <tr>
              <td
                colSpan={8}
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#999",
                  fontSize: "12px",
                }}
              >
                Ingen medarbejdere i afdelingen
              </td>
            </tr>
          )}

          {deptEmployees.map((emp, empIdx) => {
            const isEven = empIdx % 2 === 0;
            // Check if this employee has any shifts this week
            const hasAnyShift = weekDays.some(
              (day) => getAssignments(emp.id, day).length > 0
            );

            return (
              <tr key={emp.id}>
                {/* Name cell */}
                <td
                  style={{
                    background: isEven ? "#f8fafc" : "#fff",
                    padding: "6px 10px",
                    fontWeight: 600,
                    fontSize: "11px",
                    color: "#1e293b",
                    borderBottom: "1px solid #e2e8f0",
                    borderRight: "1px solid #e2e8f0",
                    verticalAlign: "middle",
                  }}
                >
                  <div>{emp.name}</div>
                  {isAdmin && emp.department && (
                    <div
                      style={{
                        fontSize: "9px",
                        color: "#94a3b8",
                        fontWeight: 400,
                        marginTop: "1px",
                      }}
                    >
                      {emp.department.name}
                    </div>
                  )}
                </td>

                {/* Day cells */}
                {weekDays.map((day, di) => {
                  const cellAssignments = getAssignments(emp.id, day);
                  const isWeekend = di >= 5;
                  const isToday = isSameDay(day, today);

                  return (
                    <td
                      key={day.toISOString()}
                      style={{
                        background: isToday
                          ? "#eff6ff"
                          : isWeekend
                          ? "#f1f5f9"
                          : isEven
                          ? "#f8fafc"
                          : "#fff",
                        padding: "4px 3px",
                        verticalAlign: "top",
                        borderBottom: "1px solid #e2e8f0",
                        borderLeft: "1px solid #e2e8f0",
                        minHeight: "42px",
                      }}
                    >
                      {cellAssignments.length === 0 && isWeekend && (
                        <div
                          style={{
                            height: "100%",
                            minHeight: "36px",
                            background: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 6px)",
                            borderRadius: "3px",
                          }}
                        />
                      )}

                      {cellAssignments.map((a) => (
                        <div
                          key={a.id}
                          style={{
                            background: a.template.color,
                            borderRadius: "4px",
                            padding: "3px 5px",
                            marginBottom: "2px",
                            color: "#fff",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "10px",
                              lineHeight: 1.2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {a.template.name}
                          </div>
                          <div
                            style={{
                              fontSize: "9px",
                              opacity: 0.85,
                              lineHeight: 1.2,
                            }}
                          >
                            {a.template.startTime}–{a.template.endTime}
                          </div>
                          {a.note && (
                            <div
                              style={{
                                fontSize: "8px",
                                opacity: 0.75,
                                fontStyle: "italic",
                                marginTop: "1px",
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {a.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Legend ── */}
      {legendItems.length > 0 && (
        <div
          style={{
            marginTop: "14px",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "10px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              color: "#64748b",
              marginBottom: "6px",
            }}
          >
            Forklaring
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {legendItems.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "10px",
                  color: "#334155",
                }}
              >
                {/* Coloured circle */}
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: t.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span style={{ color: "#94a3b8" }}>
                  {t.startTime}–{t.endTime}
                </span>
                {isAdmin && (
                  <span
                    style={{
                      color: "#cbd5e1",
                      fontSize: "9px",
                    }}
                  >
                    · {t.department.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div
        style={{
          marginTop: "10px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "9px",
          color: "#cbd5e1",
          borderTop: "1px solid #f1f5f9",
          paddingTop: "6px",
        }}
      >
        <span>WorkPlan — Intern ferieplanlægning</span>
        <span>
          {deptEmployees.length} medarbejder
          {deptEmployees.length !== 1 ? "e" : ""} · Uge {weekNumber}
        </span>
      </div>
    </div>
  );
}
