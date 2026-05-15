"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";

interface Department { id: string; name: string; }
interface RequestFiltersProps { departments?: Department[]; showDeptFilter?: boolean; }

const STATUS_OPTIONS = [
  { value: "",           label: "Alle" },
  { value: "PENDING",    label: "Afventer" },
  { value: "APPROVED",   label: "Godkendt" },
  { value: "REJECTED",   label: "Afvist" },
  { value: "CANCELLED",  label: "Annulleret" },
];

const MONTHS = [
  { value: "", label: "Alle måneder" },
  ...["Januar","Februar","Marts","April","Maj","Juni","Juli","August","September","Oktober","November","December"]
    .map((label, i) => ({ value: String(i + 1), label })),
];

const SELECT_CLS = "border border-border rounded-md px-3 py-2 text-[13px] bg-surface text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)]";

export function RequestFilters({ departments, showDeptFilter }: RequestFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const status = searchParams.get("status") ?? "";
  const month  = searchParams.get("month")  ?? "";
  const year   = searchParams.get("year")   ?? String(new Date().getFullYear());
  const deptId = searchParams.get("departmentId") ?? "";

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const activeCount = [status, month !== "" ? month : "", deptId].filter(Boolean).length;

  const filterSelects = (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Status tabs */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-text-subtle mb-1.5">Status</p>
        <div className="flex gap-1 p-1 rounded-lg border border-border bg-bg">
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => updateParam("status", opt.value)}
              className={cn(
                "px-3 py-1 rounded-md text-[12px] font-semibold transition-colors",
                status === opt.value ? "bg-surface text-text shadow-xs" : "text-text-muted hover:text-text"
              )}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-text-subtle mb-1.5">Måned</p>
        <select value={month} onChange={(e) => updateParam("month", e.target.value)} className={SELECT_CLS}>
          {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-text-subtle mb-1.5">År</p>
        <select value={year} onChange={(e) => updateParam("year", e.target.value)} className={SELECT_CLS}>
          {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>

      {showDeptFilter && departments && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-subtle mb-1.5">Afdeling</p>
          <select value={deptId} onChange={(e) => updateParam("departmentId", e.target.value)} className={SELECT_CLS}>
            <option value="">Alle afdelinger</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );

  return (
    <div className="mb-5">
      {/* Desktop */}
      <div className="hidden sm:block">{filterSelects}</div>

      {/* Mobile collapsible */}
      <div className="sm:hidden">
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 text-[13px] font-semibold text-text border border-border bg-surface rounded-md px-3 py-2">
          <SlidersHorizontal size={14} />
          Filtre
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{activeCount}</span>
          )}
        </button>
        {mobileOpen && (
          <div className="mt-2 p-4 bg-surface border border-border rounded-lg space-y-4">
            {filterSelects}
          </div>
        )}
      </div>
    </div>
  );
}
