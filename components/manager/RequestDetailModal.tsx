"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Avatar } from "@/components/ui/Avatar";
import { Check, X, Loader2 } from "lucide-react";
import { AuditLogPanel } from "@/components/manager/AuditLogPanel";
import { CapacityWarningDialog } from "@/components/manager/CapacityWarningDialog";
import { RejectDialog } from "@/components/manager/RejectDialog";
import { EditNoteDialog } from "@/components/manager/EditNoteDialog";
import {
  approveRequest,
  rejectRequest,
  cancelRequestAsManager,
  editRequestNote,
  getRequestWithAudit,
} from "@/actions/manager";
import { formatDate, ENTRY_TYPE_LABELS, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS, totalDaysFromEntries } from "@/lib/utils";
import type { VacationRequestRow } from "@/types";

interface RequestDetailModalProps {
  requestId: string | null;
  onClose: () => void;
}

export function RequestDetailModal({ requestId, onClose }: RequestDetailModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionState, setActionState] = useState<"idle"|"approving"|"cancelling">("idle");
  const [data, setData] = useState<{
    request: VacationRequestRow;
    auditLogs: { id: string; action: string; details: string | null; createdAt: Date; user: { name: string } }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showCapacityDialog, setShowCapacityDialog] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (!requestId) { setData(null); return; }
    setLoading(true);
    setError("");
    getRequestWithAudit(requestId).then((result) => {
      if (result.ok && result.data) setData(result.data);
      else setError(result.error ?? "Fejl");
      setLoading(false);
    });
  }, [requestId]);

  function refresh() {
    if (!requestId) return;
    getRequestWithAudit(requestId).then((result) => {
      if (result.ok && result.data) setData(result.data);
    });
    startTransition(() => router.refresh());
  }

  async function handleApprove() {
    if (!requestId) return;
    setError(""); setActionState("approving");
    const result = await approveRequest(requestId);
    if (!result.ok) { setError(result.error ?? "Fejl"); setActionState("idle"); return; }
    if (result.data?.capacityWarning) {
      setCapacityWarning(result.data.capacityWarning);
      setShowCapacityDialog(true);
    }
    refresh();
  }

  async function handleApproveConfirmed() {
    setShowCapacityDialog(false);
    setCapacityWarning("");
    refresh();
  }

  async function handleReject(reason: string) {
    if (!requestId) return;
    setShowRejectDialog(false);
    setError("");
    const result = await rejectRequest(requestId, reason);
    if (!result.ok) { setError(result.error ?? "Fejl"); return; }
    refresh();
  }

  async function handleCancel() {
    if (!requestId || !confirm("Annuller denne ansøgning?")) return;
    setError(""); setActionState("cancelling");
    const result = await cancelRequestAsManager(requestId);
    if (!result.ok) { setError(result.error ?? "Fejl"); setActionState("idle"); return; }
    refresh();
  }

  async function handleEditNote(note: string) {
    if (!requestId) return;
    setShowEditDialog(false);
    setError("");
    const result = await editRequestNote(requestId, note);
    if (!result.ok) { setError(result.error ?? "Fejl"); return; }
    refresh();
  }

  const busy = actionState !== "idle";
  const req = data?.request;
  const totalDays = req ? totalDaysFromEntries(req.entries) : 0;

  return (
    <>
      <Modal
        open={!!requestId}
        onClose={onClose}
        title="Ansøgningsdetaljer"
        className="sm:max-w-xl"
      >
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {error && <p className="text-[13px] text-danger bg-danger-bg px-3 py-2 rounded-md">{error}</p>}

        {req && !loading && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <Avatar name={req.user.name} size={48} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-text text-[15px] leading-tight">{req.user.name}</p>
                    <p className="text-[13px] text-text-muted">{req.department.name}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              </div>
            </div>

            {/* Summary */}
            <Card className="p-4 bg-bg">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <p className="text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-0.5">Dage i alt</p>
                  <p className="font-semibold text-text">{totalDays} dag{totalDays !== 1 ? "e" : ""}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-0.5">Oprettet</p>
                  <p className="text-text-muted">{formatDate(req.createdAt)}</p>
                </div>
                {req.note && (
                  <div className="col-span-2">
                    <p className="text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-0.5">Note</p>
                    <p className="text-text-muted italic">"{req.note}"</p>
                  </div>
                )}
                {req.status === "REJECTED" && (req as any).rejectionReason && (
                  <div className="col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-0.5 text-danger">Begrundelse for afvisning</p>
                    <p className="text-danger-text italic">"{(req as any).rejectionReason}"</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Entries */}
            <div>
              <SectionLabel>Datolinjer ({req.entries.length})</SectionLabel>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-3">
                {req.entries.map((entry) => {
                  const absColor = ABSENCE_TYPE_COLORS[(entry as any).absenceType];
                  return (
                    <div key={entry.id} className="flex justify-between items-center text-[13px] py-1.5 border-b border-border last:border-0">
                      <span className="text-text">{formatDate(entry.date)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: absColor?.bg ?? "var(--c-bg)", color: absColor?.text ?? "var(--c-text-muted)" }}>
                          {ABSENCE_TYPE_LABELS[(entry as any).absenceType] ?? (entry as any).absenceType ?? "Ferie"}
                        </span>
                        <span className="text-[11px] text-text-subtle">{ENTRY_TYPE_LABELS[entry.type] ?? entry.type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              {req.status === "PENDING" && (
                <div className="grid grid-cols-2 gap-2">
                  <Btn
                    onClick={handleApprove}
                    disabled={busy}
                    variant="success"
                    full
                    icon={actionState === "approving" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  >
                    {actionState === "approving" ? "Godkender…" : "Godkend"}
                  </Btn>
                  <Btn onClick={() => setShowRejectDialog(true)} disabled={busy} variant="danger" full icon={<X size={14} />}>
                    Afvis
                  </Btn>
                </div>
              )}
              <div className="flex gap-2">
                {["PENDING", "APPROVED"].includes(req.status) && (
                  <Btn
                    onClick={handleCancel}
                    disabled={busy}
                    variant="secondary"
                    full
                    icon={actionState === "cancelling" ? <Loader2 size={14} className="animate-spin" /> : undefined}
                  >
                    {actionState === "cancelling" ? "Annullerer…" : "Annuller"}
                  </Btn>
                )}
                <Btn onClick={() => setShowEditDialog(true)} disabled={busy} variant="ghost" full>Rediger note</Btn>
              </div>
            </div>

            {/* Audit log */}
            {data?.auditLogs && data.auditLogs.length > 0 && (
              <div className="pt-4 border-t border-border">
                <SectionLabel>Historik</SectionLabel>
                <AuditLogPanel logs={data.auditLogs} />
              </div>
            )}
          </div>
        )}
      </Modal>

      <CapacityWarningDialog
        open={showCapacityDialog}
        warning={capacityWarning}
        onConfirm={handleApproveConfirmed}
        onClose={() => { setShowCapacityDialog(false); setCapacityWarning(""); }}
      />

      <RejectDialog
        open={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleReject}
        employeeName={req?.user.name ?? ""}
      />

      <EditNoteDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onConfirm={handleEditNote}
        currentNote={req?.note ?? ""}
      />
    </>
  );
}
