"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { formatDate, formatDateShort, totalDaysFromEntries, ENTRY_TYPE_LABELS, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/lib/utils";
import { cancelOwnRequest } from "@/actions/requests";
import type { VacationRequestRow } from "@/types";

interface RequestCardProps {
  request: VacationRequestRow;
  showCancelButton?: boolean;
  onCancelled?: () => void;
}

export function RequestCard({ request, showCancelButton, onCancelled }: RequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  const sortedEntries = [...request.entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const totalDays = totalDaysFromEntries(request.entries);
  const firstDate = sortedEntries[0]?.date;
  const lastDate = sortedEntries[sortedEntries.length - 1]?.date;

  async function handleCancel() {
    if (!confirm("Annuller ansøgning?")) return;
    setCancelling(true);
    setError("");
    const result = await cancelOwnRequest(request.id);
    if (!result.ok) {
      setError(result.error ?? "Fejl");
      setCancelling(false);
    } else {
      onCancelled?.();
    }
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <StatusBadge status={request.status} />
              <span className="text-xs text-gray-400">
                Oprettet {formatDate(request.createdAt)}
              </span>
            </div>

            <p className="text-sm font-medium text-gray-800">
              {firstDate && lastDate
                ? firstDate === lastDate
                  ? formatDate(firstDate)
                  : `${formatDate(firstDate)} – ${formatDate(lastDate)}`
                : "—"}
            </p>

            <p className="text-xs text-gray-500 mt-0.5">
              {totalDays} dag{totalDays !== 1 ? "e" : ""}
              {request.note && (
                <span className="ml-2 italic text-gray-400">"{request.note}"</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {showCancelButton && request.status === "PENDING" && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {cancelling ? "..." : "Annuller"}
              </button>
            )}
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Detaljer
            </button>
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mt-2">
            {error}
          </Alert>
        )}
      </div>

      <Modal
        open={expanded}
        onClose={() => setExpanded(false)}
        title="Ansøgningsdetaljer"
        className="max-w-lg"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <span className="text-sm text-gray-500">
              {request.department?.name}
            </span>
          </div>

          {request.note && (
            <p className="text-sm text-gray-600 italic bg-gray-50 rounded px-3 py-2">
              "{request.note}"
            </p>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Datolinjer ({sortedEntries.length})
            </p>
            <div className="space-y-1">
              {sortedEntries.map((entry) => {
                const absColor = ABSENCE_TYPE_COLORS[(entry as any).absenceType];
                return (
                  <div key={entry.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-700">{formatDate(entry.date)}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: absColor?.bg ?? "#f3f4f6", color: absColor?.text ?? "#374151" }}
                      >
                        {ABSENCE_TYPE_LABELS[(entry as any).absenceType] ?? "Ferie"}
                      </span>
                      <span className="text-xs text-gray-400">{ENTRY_TYPE_LABELS[entry.type] ?? entry.type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-semibold text-gray-800">
              {totalDays} dag{totalDays !== 1 ? "e" : ""}
            </span>
          </div>

          <p className="text-xs text-gray-400">
            Oprettet {formatDate(request.createdAt)}
          </p>
        </div>
      </Modal>
    </>
  );
}
