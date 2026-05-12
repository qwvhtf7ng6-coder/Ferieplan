"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isWeekend } from "date-fns";
import { da } from "date-fns/locale";
import { getMonthDays, cn } from "@/lib/utils";

interface CalendarGridProps {
  year: number;
  month: number;
  departments: {
    id: string;
    name: string;
    users: { id: string; name: string }[];
  }[];
  requests: {
    id: string;
    status: "APPROVED" | "PENDING";
    user: { id: string; name: string };
    entries: { date: string; type: string }[];
  }[];
  holidays: { date: string; name: string }[];
}

export default function CalendarGrid({
  year,
  month,
  departments,
  requests,
  holidays,
}: CalendarGridProps) {
  const router = useRouter();
  const [modal, setModal] = useState<{ date: string; userId: string; reqs: typeof requests } | null>(null);

  const days = getMonthDays(year, month);
  const holidayMap = new Map(holidays.map((h) => [h.date.slice(0, 10), h.name]));

  // Build lookup: userId -> date -> requests
  const lookup = new Map<string, Map<string, typeof requests>>();
  for (const req of requests) {
    for (const entry of req.entries) {
      const dateKey = new Date(entry.date).toISOString().slice(0, 10);
      if (!lookup.has(req.user.id)) lookup.set(req.user.id, new Map());
      const dateMap = lookup.get(req.user.id)!;
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(req);
    }
  }

  function prevMonth() {
    const d = new Date(year, month - 2, 1);
    router.push(`/manager/calendar?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
  }
  function nextMonth() {
    const d = new Date(year, month, 1);
    router.push(`/manager/calendar?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={prevMonth} className="px-3 py-1 border rounded text-sm hover:bg-gray-100">←</button>
        <h2 className="text-lg font-bold capitalize">
          {format(new Date(year, month - 1), "MMMM yyyy", { locale: da })}
        </h2>
        <button onClick={nextMonth} className="px-3 py-1 border rounded text-sm hover:bg-gray-100">→</button>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse min-w-max">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white border border-gray-200 px-3 py-2 text-left min-w-[140px]">
                Medarbejder
              </th>
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const isHoliday = holidayMap.has(key);
                const weekend = isWeekend(d);
                return (
                  <th
                    key={key}
                    className={cn(
                      "border border-gray-200 px-1 py-1 text-center min-w-[28px] font-normal",
                      weekend && "bg-gray-100",
                      isHoliday && "bg-red-50"
                    )}
                    title={isHoliday ? holidayMap.get(key) : undefined}
                  >
                    <div>{format(d, "d")}</div>
                    <div className="text-gray-400">{format(d, "EEEEE", { locale: da })}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <>
                <tr key={`dept-${dept.id}`}>
                  <td
                    colSpan={days.length + 1}
                    className="sticky left-0 bg-gray-700 text-white px-3 py-1 font-semibold text-xs"
                  >
                    {dept.name}
                  </td>
                </tr>
                {dept.users.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white border border-gray-200 px-3 py-1 whitespace-nowrap">
                      {emp.name}
                    </td>
                    {days.map((d) => {
                      const key = format(d, "yyyy-MM-dd");
                      const reqs = lookup.get(emp.id)?.get(key) ?? [];
                      const weekend = isWeekend(d);
                      const isHoliday = holidayMap.has(key);

                      const hasApproved = reqs.some((r) => r.status === "APPROVED");
                      const hasPending = reqs.some((r) => r.status === "PENDING");

                      return (
                        <td
                          key={key}
                          className={cn(
                            "border border-gray-200 text-center cursor-pointer",
                            weekend && "bg-gray-50",
                            isHoliday && "bg-red-50",
                            hasApproved && "bg-green-200",
                            !hasApproved && hasPending && "bg-yellow-200"
                          )}
                          onClick={() =>
                            reqs.length > 0 &&
                            setModal({ date: key, userId: emp.id, reqs })
                          }
                        >
                          {hasApproved ? "✓" : hasPending ? "?" : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-green-200 rounded inline-block"></span>Godkendt</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-yellow-200 rounded inline-block"></span>Afventer</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-red-50 rounded inline-block"></span>Helligdag</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-gray-100 rounded inline-block"></span>Weekend</span>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-3">
              {modal.date}
            </h3>
            {modal.reqs.map((r) => (
              <div key={r.id} className="text-sm border-b border-gray-100 py-2">
                <div className="font-medium">{r.user.name}</div>
                <div className="text-gray-500">Status: {r.status}</div>
              </div>
            ))}
            <button
              onClick={() => setModal(null)}
              className="mt-4 text-sm text-gray-500 hover:text-gray-800"
            >
              Luk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
