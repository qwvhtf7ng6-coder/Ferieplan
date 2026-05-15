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
import { Check, X, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

interface ManagerRequestRowProps {
  request: VacationRequestRow;
  onOpenDetail: (id: string) => void;
}

type ActionState = "idle" | "approving" | "cancelling";

export function ManagerRequestRow({ request, onOpenDetail }: ManagerRequestRowProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState("");
  const [showCapacity, setShowCapacity] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState("");
  const [showReject, setShowReject] = useState(false);

  const busy = actionState !== "idle";

  const sortedEntries = [...request.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalDays = totalDaysFromEntries(request.entries);
  const first = sortedEntries[0]?.date;
  const last  = sortedEntries[sortedEntries.length - 1]?.date;
  const dateRange = first && last ? (first === last ? formatDate(first) : `${formatDate(first)} – ${formatDate(last)}`) : "—";

  function refresh() { startTransition(() => router.refresh()); }

  async function handleApprove(e: React.MouseEvent) {
    e.stopPropagation();
    setError("");
    setActionState("approving");
    const result = await approveRequest(request.id);
    if (!result.ok) {
      setError(result.error ?? "Fejl");
      setActionState("idle");
      return;
    }
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
    setShowCancelConfirm(true);
  }

  async function confirmCancel() {
    setShowCancelConfirm(false);
    setError("");
    setActionState("cancelling");
    const result = await cancelRequestAsManager(request.id);
    if (!result.ok) {
      setError(result.error ?? "Fejl");
      setActionState("idle");
      return;
    }
    refresh();
  }

  return (
    <>
      <Card interactive onClick={() => !busy && onOpenDetail(request.id)} className="p-4">
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

          {/* Actions */}
          {(request.status === "PENDING" || request.status === "APPROVED") && (
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {request.status === "PENDING" && (
                <>
                  {/* Godkend */}
                  <button
                    onClick={handleApprove}
                    disabled={busy}
                    className={cn(
                      "h-8 px-3 rounded-md text-[12px] font-semibold flex items-center gap-1.5 transition-all",
                      actionState === "approving"
                        ? "bg-success text-white cursor-wait"
                        : "bg-success-bg text-success-text hover:bg-success hover:text-white disabled:opacity-50",
                    )}
                  >
                    {actionState === "approving"
                      ? <><Loader2 size={12} className="animate-spin" /> Godkender…</>
                      : <><Check size={12} /> Godkend</>
                    }
                  </button>

                  {/* Afvis */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowReject(true); }}
                    disabled={busy}
                    className="h-8 px-3 rounded-md text-[12px] font-semibold bg-danger-bg text-danger-text hover:bg-danger hover:text-white disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    <X size={12} /> Afvis
                  </button>
                </>
              )}

              {/* Annuller */}
              {["PENDING", "APPROVED"].includes(request.status) && (
                <button
                  onClick={handleCancel}
                  disabled={busy}
                  className={cn(
                    "h-8 px-3 rounded-md text-[12px] font-semibold flex items-center gap-1.5 transition-all",
                    actionState === "cancelling"
                      ? "bg-border text-text-muted cursor-wait"
                      : "bg-bg text-text-muted hover:text-text hover:bg-border disabled:opacity-50",
                  )}
                >
                  {actionState === "cancelling"
                    ? <><Loader2 size={12} className="animate-spin" /> Annullerer…</>
                    : "Annuller"
                  }
                </button>
              )}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      </Card>

      <ConfirmDialog
        open={showCancelConfirm}
        title="Annuller ansøgning"
        message="Er du sikker på at du vil annullere denne ansøgning?"
        confirmLabel="Annuller ansøgning"
        onConfirm={confirmCancel}
        onClose={() => setShowCancelConfirm(false)}
      />
      <CapacityWarningDialog open={showCapacity} warning={capacityWarning}
        onConfirm={() => { setShowCapacity(false); setCapacityWarning(""); }}
        onClose={() => { setShowCapacity(false); setCapacityWarning(""); }} />

      <RejectDialog open={showReject} onClose={() => setShowReject(false)}
        onConfirm={handleReject} employeeName={request.user.name} />
    </>
  );
}
