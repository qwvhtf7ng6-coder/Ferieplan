"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CapacityWarningDialog } from "@/components/manager/CapacityWarningDialog";
import { RejectDialog } from "@/components/manager/RejectDialog";
import { formatDate, totalDaysFromEntries } from "@/lib/utils";
import { approveRequest, rejectRequest, cancelRequestAsManager } from "@/actions/manager";
import type { VacationRequestRow } from "@/types";
import { Check, X } from "lucide-react";

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

  const sortedEntries = [...request.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalDays = totalDaysFromEntries(request.entries);
  const first = sortedEntries[0]?.date;
  const last  = sortedEntries[sortedEntries.length - 1]?.date;
  const dateRange = first && last ? (first === last ? formatDate(first) : `${formatDate(first)} – ${formatDate(last)}`) : "—";

  function refresh() { startTransition(() => router.refresh()); }

  async function handleApprove(e: React.MouseEvent) {
    e.stopPropagation(); setError("");
    const result = await approveRequest(request.id);
    if (!result.ok) { setError(result.error ?? "Fejl"); return; }
    if (result.data?.capacityWarning) { setCapacityWarning(result.data.capacityWarning); setShowCapacity(true); }
    refresh();
  }

  async function handleReject(reason: string) {
    setShowReject(false); setError("");
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
      <Card interactive onClick={() => onOpenDetail(request.id)} className="p-4">
        <div className="flex items-start gap-3">
          <Avatar name={request.user.name} size={36} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[13px] font-semibold text-text">{request.user.name}</span>
              <span className="text-[12px] text-text-subtle">{request.department.name}</span>
              <StatusBadge status={request.status as any} />
            </div>
            <p className="text-[13px] text-text">{dateRange}</p>
            <div className="flex items-center gap-2 mt-0.5 text-[12px] text-text-muted">
              <span>{totalDays} dag{totalDays !== 1 ? "e" : ""}</span>
              {request.note && <span className="italic truncate max-w-[180px]">"{request.note}"</span>}
            </div>
          </div>

          {/* Actions — stop propagation so card click doesn't trigger */}
          {(request.status === "PENDING" || request.status === "APPROVED") && (
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {request.status === "PENDING" && (
                <>
                  <button onClick={handleApprove} disabled={isPending}
                    className="h-8 px-3 rounded-md text-[12px] font-semibold bg-success-bg text-success-text hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center gap-1">
                    <Check size={12} /> Godkend
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowReject(true); }} disabled={isPending}
                    className="h-8 px-3 rounded-md text-[12px] font-semibold bg-danger-bg text-danger-text hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center gap-1">
                    <X size={12} /> Afvis
                  </button>
                </>
              )}
              {["PENDING","APPROVED"].includes(request.status) && (
                <button onClick={handleCancel} disabled={isPending}
                  className="h-8 px-3 rounded-md text-[12px] font-semibold bg-bg text-text-muted hover:text-text hover:bg-border disabled:opacity-50 transition-colors">
                  Annuller
                </button>
              )}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      </Card>

      <CapacityWarningDialog open={showCapacity} warning={capacityWarning}
        onConfirm={() => { setShowCapacity(false); setCapacityWarning(""); }}
        onClose={() => { setShowCapacity(false); setCapacityWarning(""); }} />

      <RejectDialog open={showReject} onClose={() => setShowReject(false)}
        onConfirm={handleReject} employeeName={request.user.name} />
    </>
  );
}
