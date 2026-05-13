"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { CapacityWarningDialog } from "@/components/manager/CapacityWarningDialog";
import { RejectDialog } from "@/components/manager/RejectDialog";
import { formatDate, totalDaysFromEntries } from "@/lib/utils";
import { approveRequest, rejectRequest, cancelRequestAsManager } from "@/actions/manager";
import type { VacationRequestRow } from "@/types";

interface ManagerRequestRowProps {
  request: VacationRequestRow;
  onOpenDetail: (id: string) => void;
}

export function ManagerRequestRow({ request, onOpenDetail }: ManagerRequestRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showCapacity, setShowCapacity] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState("");
  const [showReject, setShowReject] = useState(false);

  const sortedEntries = [...request.entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const totalDays = totalDaysFromEntries(request.entries);
  const first = sortedEntries[0]?.date;
  const last = sortedEntries[sortedEntries.length - 1]?.date;

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleApprove(e: React.MouseEvent) {
    e.stopPropagation();
    setError("");
    const result = await approveRequest(request.id);
    if (!result.ok) { setError(result.error ?? "Fejl"); return; }
    if (result.data?.capacityWarning) {
      setCapacityWarning(result.data.capacityWarning);
      setShowCapacity(true);
    }
    refresh();
  }

  async function handleReject(reason: string) {
    setShowReject(false);
    setError("");
    const result = await rejectRequest(request.id, reason);
    if (!result.ok) { setError(result.error ?? "Fejl"); return; }
    refresh();
  }

  async function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Annuller ansøgning?")) return;
    setError("");
    const result = await cancelRequestAsManager(request.id);
    if (!result.ok) { setError(result.error ?? "Fejl"); return; }
    refresh();
  }

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
        onClick={() => onOpenDetail(request.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onOpenDetail(request.id)}
        aria-label={`Ansøgning fra ${request.user.name}`}
      >
        {/* Top row: name + badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-semibold text-gray-900 text-sm">{request.user.name}</span>
            <span className="text-xs text-gray-400 hidden sm:inline">{request.department.name}</span>
            <StatusBadge status={request.status} />
          </div>
          {isPending && <Spinner className="text-gray-400 shrink-0" />}
        </div>

        {/* Department on mobile */}
        <p className="text-xs text-gray-400 sm:hidden mb-1">{request.department.name}</p>

        {/* Date range */}
        <p className="text-sm text-gray-700">
          {first && last
            ? first === last
              ? formatDate(first)
              : `${formatDate(first)} – ${formatDate(last)}`
            : "—"}
        </p>

        <div className="flex items-center gap-3 mt-0.5 mb-3">
          <span className="text-xs text-gray-500">
            {totalDays} dag{totalDays !== 1 ? "e" : ""}
          </span>
          {request.note && (
            <span className="text-xs text-gray-400 italic truncate max-w-[200px]">
              "{request.note}"
            </span>
          )}
        </div>

        {/* Action buttons — always visible, full width on mobile */}
        {(request.status === "PENDING" || ["PENDING", "APPROVED"].includes(request.status)) && (
          <div
            className="flex flex-wrap gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {request.status === "PENDING" && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={isPending}
                  className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors text-center"
                >
                  Godkend
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowReject(true); }}
                  disabled={isPending}
                  className="flex-1 sm:flex-none bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors text-center"
                >
                  Afvis
                </button>
              </>
            )}

            {["PENDING", "APPROVED"].includes(request.status) && (
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 sm:flex-none bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors text-center"
              >
                Annuller
              </button>
            )}
          </div>
        )}

        {error && (
          <Alert variant="error" className="mt-2">
            {error}
          </Alert>
        )}
      </div>

      <CapacityWarningDialog
        open={showCapacity}
        warning={capacityWarning}
        onConfirm={() => { setShowCapacity(false); setCapacityWarning(""); }}
        onClose={() => { setShowCapacity(false); setCapacityWarning(""); }}
      />

      <RejectDialog
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={handleReject}
        employeeName={request.user.name}
      />
    </>
  );
}
