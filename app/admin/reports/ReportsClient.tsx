"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dept { id: string; name: string; }
interface ReportUser { id: string; name: string; email: string; role: string; department: { id: string; name: string } | null; }
interface ReportEntry { id: string; date: string; type: string; days: number; }
interface ReportRequest {
  id: string; status: string; note: string | null; createdAt: string;
  userId: string; departmentId: string;
  user: { id: string; name: string; email: string };
  department: { id: string; name: string };
  entries: ReportEntry[];
}

interface Props {
  departments: Dept[];
  users: ReportUser[];
  requests: ReportRequest[];
  currentYear: number;
}

type Tab = "absence" | "department" | "export";

const MONTHS = ["Januar","Februar","Marts","April","Maj","Juni","Juli","August","September","Oktober","November","December"];
const ROLE_LABELS: Record<string, string> = { EMPLOYEE: "Medarbejder", MANAGER: "Leder", ADMIN: "Admin" };
const STATUS_LABELS: Record<string, string> = { APPROVED: "Godkendt", PENDING: "Afventer", REJECTED: "Afvist", CANCELLED: "Annulleret" };

function formatDK(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getFullYear()}`;
}

// ─── CSV helper ───────────────────────────────────────────────────────────────

function downloadCSV(rows: string[][], filename: string) {
  const bom = "\uFEFF"; // UTF-8 BOM for Excel
  const csv = bom + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Absence report ───────────────────────────────────────────────────────────

function AbsenceReport({ users, requests, departments, currentYear }: Props) {
  const years = useMemo(() => {
    const ys = new Set<number>();
    requests.forEach((r) => ys.add(new Date(r.createdAt).getFullYear()));
    ys.add(currentYear);
    return [...ys].sort((a, b) => b - a);
  }, [requests, currentYear]);

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | "all">("all");
  const [deptFilter, setDeptFilter] = useState("");

  const rows = useMemo(() => {
    return users
      .filter((u) => !deptFilter || u.department?.id === deptFilter)
      .map((u) => {
        const userReqs = requests.filter((r) => {
          if (r.userId !== u.id) return false;
          if (r.status !== "APPROVED") return false;
          const y = new Date(r.createdAt).getFullYear();
          if (y !== year) return false;
          return true;
        });

        // Filter entries by month if set
        const filteredEntries = userReqs.flatMap((r) =>
          r.entries.filter((e) => {
            const d = new Date(e.date);
            if (d.getFullYear() !== year) return false;
            if (month !== "all" && d.getMonth() !== month) return false;
            return true;
          })
        );

        const totalDays = filteredEntries.reduce((s, e) => s + e.days, 0);

        // Monthly breakdown
        const monthly = Array.from({ length: 12 }, (_, m) => {
          const days = filteredEntries.filter((e) => new Date(e.date).getMonth() === m).reduce((s, e) => s + e.days, 0);
          return days;
        });

        return { user: u, totalDays, monthly, reqCount: userReqs.length };
      })
      .filter((r) => month === "all" ? r.totalDays > 0 : r.totalDays > 0);
  }, [users, requests, year, month, deptFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-xl p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">År</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Måned</label>
          <select value={month} onChange={(e) => setMonth(e.target.value === "all" ? "all" : Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="all">Hele året</option>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Afdeling</label>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Alle afdelinger</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button
          onClick={() => {
            const header = month === "all"
              ? ["Navn", "Email", "Afdeling", "Rolle", ...MONTHS, "Total dage"]
              : ["Navn", "Email", "Afdeling", "Rolle", `${MONTHS[month as number]} ${year}`, "Total dage"];
            const data = rows.map((r) =>
              month === "all"
                ? [r.user.name, r.user.email, r.user.department?.name ?? "—", ROLE_LABELS[r.user.role] ?? r.user.role, ...r.monthly.map(String), String(r.totalDays)]
                : [r.user.name, r.user.email, r.user.department?.name ?? "—", ROLE_LABELS[r.user.role] ?? r.user.role, String(r.totalDays), String(r.totalDays)]
            );
            downloadCSV([header, ...data], `fraværsrapport-${year}${month !== "all" ? `-${(month as number)+1}` : ""}.csv`);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          ↓ Eksporter CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Ingen godkendte feriedage i den valgte periode.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left sticky left-0 bg-gray-50">Medarbejder</th>
                  <th className="px-4 py-3 text-left">Afdeling</th>
                  {month === "all"
                    ? MONTHS.map((m, i) => <th key={i} className="px-2 py-3 text-center min-w-[44px]">{m.slice(0, 3)}</th>)
                    : <th className="px-4 py-3 text-center">{MONTHS[month as number]}</th>
                  }
                  <th className="px-4 py-3 text-center font-bold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 sticky left-0 bg-white">
                      <p className="font-medium text-gray-900">{r.user.name}</p>
                      <p className="text-xs text-gray-400">{r.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.user.department?.name ?? "—"}</td>
                    {month === "all"
                      ? r.monthly.map((d, i) => (
                          <td key={i} className={cn("px-2 py-3 text-center text-xs", d > 0 ? "text-blue-700 font-semibold" : "text-gray-300")}>
                            {d > 0 ? d : "·"}
                          </td>
                        ))
                      : <td className="px-4 py-3 text-center font-semibold text-blue-700">{r.totalDays}</td>
                    }
                    <td className="px-4 py-3 text-center font-bold text-gray-900">{r.totalDays}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="px-4 py-2 text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50">I alt</td>
                  <td />
                  {month === "all"
                    ? Array.from({ length: 12 }, (_, m) => (
                        <td key={m} className="px-2 py-2 text-center text-xs font-semibold text-gray-600">
                          {rows.reduce((s, r) => s + r.monthly[m], 0) || ""}
                        </td>
                      ))
                    : <td className="px-4 py-2 text-center text-xs font-semibold text-gray-600">{rows.reduce((s, r) => s + r.totalDays, 0)}</td>
                  }
                  <td className="px-4 py-2 text-center text-sm font-bold text-gray-900">
                    {rows.reduce((s, r) => s + r.totalDays, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Department report ────────────────────────────────────────────────────────

function DepartmentReport({ departments, requests, currentYear }: Props) {
  const years = useMemo(() => {
    const ys = new Set<number>();
    requests.forEach((r) => ys.add(new Date(r.createdAt).getFullYear()));
    ys.add(currentYear);
    return [...ys].sort((a, b) => b - a);
  }, [requests, currentYear]);

  const [year, setYear] = useState(currentYear);

  const rows = useMemo(() => {
    return departments.map((dept) => {
      const deptReqs = requests.filter((r) => r.departmentId === dept.id && new Date(r.createdAt).getFullYear() === year);
      const approved = deptReqs.filter((r) => r.status === "APPROVED");
      const pending = deptReqs.filter((r) => r.status === "PENDING");
      const rejected = deptReqs.filter((r) => r.status === "REJECTED");
      const totalDays = approved.flatMap((r) => r.entries).reduce((s, e) => s + e.days, 0);

      const monthly = Array.from({ length: 12 }, (_, m) =>
        approved.flatMap((r) => r.entries).filter((e) => new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === year).reduce((s, e) => s + e.days, 0)
      );

      const peakMonth = monthly.indexOf(Math.max(...monthly));

      return { dept, totalDays, monthly, peakMonth, approved: approved.length, pending: pending.length, rejected: rejected.length, total: deptReqs.length };
    }).sort((a, b) => b.totalDays - a.totalDays);
  }, [departments, requests, year]);

  const maxDays = Math.max(...rows.map((r) => r.totalDays), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-xl p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">År</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button
          onClick={() => {
            const header = ["Afdeling", ...MONTHS.map((m) => `${m} (dage)`), "Total dage", "Godkendte", "Afventende", "Afviste"];
            const data = rows.map((r) => [r.dept.name, ...r.monthly.map(String), String(r.totalDays), String(r.approved), String(r.pending), String(r.rejected)]);
            downloadCSV([header, ...data], `afdelingsrapport-${year}.csv`);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          ↓ Eksporter CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((r) => (
          <div key={r.dept.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{r.dept.name}</h3>
              <span className="text-2xl font-bold text-blue-600">{r.totalDays}</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">godkendte feriedage i {year}</p>

            {/* Bar chart */}
            <div className="flex items-end gap-0.5 h-10 mb-2">
              {r.monthly.map((d, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all"
                  style={{
                    height: d > 0 ? `${Math.max(8, (d / maxDays) * 40)}px` : "2px",
                    backgroundColor: d > 0 ? "#3b82f6" : "#e5e7eb",
                    opacity: i === r.peakMonth && d > 0 ? 1 : 0.5,
                  }}
                  title={`${MONTHS[i]}: ${d} dage`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-3">
              <span>Jan</span><span>Jun</span><span>Dec</span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-xs text-center">
              <div className="bg-green-50 rounded px-1 py-1">
                <p className="font-bold text-green-700">{r.approved}</p>
                <p className="text-gray-500">Godkendt</p>
              </div>
              <div className="bg-yellow-50 rounded px-1 py-1">
                <p className="font-bold text-yellow-700">{r.pending}</p>
                <p className="text-gray-500">Afventer</p>
              </div>
              <div className="bg-red-50 rounded px-1 py-1">
                <p className="font-bold text-red-700">{r.rejected}</p>
                <p className="text-gray-500">Afvist</p>
              </div>
            </div>

            {r.totalDays > 0 && (
              <p className="text-xs text-gray-400 mt-2">Travlest: {MONTHS[r.peakMonth]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function CsvExport({ requests, departments }: Props) {
  const [statusFilter, setStatusFilter] = useState("APPROVED");
  const [deptFilter, setDeptFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const years = useMemo(() => {
    const ys = new Set(requests.map((r) => new Date(r.createdAt).getFullYear()));
    return [...ys].sort((a, b) => b - a);
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (deptFilter && r.departmentId !== deptFilter) return false;
      if (yearFilter && new Date(r.createdAt).getFullYear() !== Number(yearFilter)) return false;
      return true;
    });
  }, [requests, statusFilter, deptFilter, yearFilter]);

  function exportRequests() {
    const header = ["ID", "Medarbejder", "Email", "Afdeling", "Status", "Dage i alt", "Første dato", "Sidste dato", "Note", "Oprettet"];
    const data = filtered.map((r) => {
      const sorted = [...r.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const totalDays = r.entries.reduce((s, e) => s + e.days, 0);
      return [
        r.id, r.user.name, r.user.email, r.department.name,
        STATUS_LABELS[r.status] ?? r.status,
        String(totalDays),
        sorted[0] ? formatDK(sorted[0].date) : "",
        sorted[sorted.length - 1] ? formatDK(sorted[sorted.length - 1].date) : "",
        r.note ?? "",
        formatDK(r.createdAt),
      ];
    });
    downloadCSV([header, ...data], `ansøgninger${statusFilter ? `-${statusFilter.toLowerCase()}` : ""}${yearFilter ? `-${yearFilter}` : ""}.csv`);
  }

  const ABSENCE_LABELS: Record<string, string> = {
    VACATION: "Ferie", VACATION_FREE: "Feriefri", MATERNITY: "Barsel",
    CHILD_SICK_DAY: "Barns første sygedag", SICK: "Sygdom",
  };

  function exportDetailed() {
    const header = ["Ansøgning ID", "Medarbejder", "Email", "Afdeling", "Status", "Dato", "Fraværstype", "Dagtype", "Dage", "Note"];
    const data = filtered.flatMap((r) =>
      r.entries.map((e) => [
        r.id, r.user.name, r.user.email, r.department.name,
        STATUS_LABELS[r.status] ?? r.status,
        formatDK(e.date),
        ABSENCE_LABELS[(e as any).absenceType] ?? (e as any).absenceType ?? "Ferie",
        e.type === "FULL_DAY" ? "Hel dag" : e.type === "HALF_DAY_AM" ? "Halvdag FM" : "Halvdag EM",
        String(e.days),
        r.note ?? "",
      ])
    );
    downloadCSV([header, ...data], `ansøgninger-detaljeret${yearFilter ? `-${yearFilter}` : ""}.csv`);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-xl p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Alle</option>
            <option value="APPROVED">Godkendt</option>
            <option value="PENDING">Afventer</option>
            <option value="REJECTED">Afvist</option>
            <option value="CANCELLED">Annulleret</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Afdeling</label>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Alle afdelinger</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">År</label>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Alle år</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Preview count */}
      <p className="text-sm text-gray-500 px-1">{filtered.length} ansøgning{filtered.length !== 1 ? "er" : ""} matcher filteret</p>

      {/* Export options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Ansøgningsoversigt</h3>
          <p className="text-sm text-gray-500 mb-4">Én linje per ansøgning med totale feriedage, datointerval og status.</p>
          <button onClick={exportRequests} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            ↓ Download oversigt ({filtered.length} rækker)
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Detaljeret eksport</h3>
          <p className="text-sm text-gray-500 mb-4">Én linje per dato — egnet til lønsystemer og detaljeret bogføring.</p>
          <button onClick={exportDetailed} className="w-full bg-gray-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors">
            ↓ Download detaljeret ({filtered.flatMap((r) => r.entries).length} rækker)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "absence",    label: "Fraværsrapport",   icon: "👤" },
  { key: "department", label: "Afdelingsrapport",  icon: "🏢" },
  { key: "export",     label: "CSV-eksport",       icon: "↓"  },
];

export default function ReportsClient(props: Props) {
  const [tab, setTab] = useState<Tab>("absence");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "absence"    && <AbsenceReport    {...props} />}
      {tab === "department" && <DepartmentReport {...props} />}
      {tab === "export"     && <CsvExport        {...props} />}
    </div>
  );
}
