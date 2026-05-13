"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

interface Department {
  id: string;
  name: string;
}

interface RequestFiltersProps {
  departments?: Department[];
  showDeptFilter?: boolean;
}

const STATUS_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "PENDING", label: "Afventer" },
  { value: "APPROVED", label: "Godkendt" },
  { value: "REJECTED", label: "Afvist" },
  { value: "CANCELLED", label: "Annulleret" },
];

const MONTHS = [
  { value: "", label: "Alle måneder" },
  { value: "1", label: "Januar" },
  { value: "2", label: "Februar" },
  { value: "3", label: "Marts" },
  { value: "4", label: "April" },
  { value: "5", label: "Maj" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function RequestFilters({ departments, showDeptFilter }: RequestFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const status = searchParams.get("status") ?? "";
  const month = searchParams.get("month") ?? "";
  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  const deptId = searchParams.get("departmentId") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const activeFilterCount = [status, month !== "" ? month : "", deptId].filter(Boolean).length;

  return (
    <div className="mb-6">
      {/* Mobile: collapsible filter panel */}
      <div className="sm:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700"
          aria-expanded={open}
        >
          <span>
            Filtre
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </span>
          <span className="text-gray-400">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <MobileFilters
              status={status}
              month={month}
              year={year}
              deptId={deptId}
              years={years}
              departments={departments}
              showDeptFilter={showDeptFilter}
              updateParam={updateParam}
            />
          </div>
        )}
      </div>

      {/* Desktop: full inline panel */}
      <div className="hidden sm:flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-xl p-4">
        {/* Status filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateParam("status", opt.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  status === opt.value
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Måned</label>
          <select
            value={month}
            onChange={(e) => updateParam("month", e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">År</label>
          <select
            value={year}
            onChange={(e) => updateParam("year", e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>

        {showDeptFilter && departments && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Afdeling</label>
            <select
              value={deptId}
              onChange={(e) => updateParam("departmentId", e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alle afdelinger</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileFilters({
  status, month, year, deptId, years, departments, showDeptFilter, updateParam,
}: {
  status: string; month: string; year: string; deptId: string;
  years: number[];
  departments?: { id: string; name: string }[];
  showDeptFilter?: boolean;
  updateParam: (key: string, value: string) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-xs text-gray-500 mb-2">Status</label>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParam("status", opt.value)}
              className={`text-xs px-3 py-2 rounded-full border transition-colors ${
                status === opt.value
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Måned</label>
          <select
            value={month}
            onChange={(e) => updateParam("month", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">År</label>
          <select
            value={year}
            onChange={(e) => updateParam("year", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {showDeptFilter && departments && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Afdeling</label>
          <select
            value={deptId}
            onChange={(e) => updateParam("departmentId", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Alle afdelinger</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
