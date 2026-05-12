"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

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

  return (
    <div className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-xl p-4 mb-6">
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

      {/* Month */}
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

      {/* Year */}
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

      {/* Department (admin only) */}
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
  );
}
