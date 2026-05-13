"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
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
import { formatDate, ENTRY_TYPE_LABELS, totalDaysFromEntries } from "@/lib/utils";
import type { VacationRequestRow } from "@/types";

interface RequestDetailModalProps {
  requestId: string | null;
  onClose: () => void;
}

export function RequestDetailModal({ requestId, onClose }: RequestDetailModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
    setError("");
    const result = await approveRequest(requestId);
    if (!result.ok) { setError(result.error ?? "Fejl"); return; }
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
    setError("");
    const result = await cancelRequestAsManager(requestId);
    if (!result.ok) { setError(result.error ?? "Fejl"); return; }
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
            <Spinner className="h-6 w-6 text-gray-400" />
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        {req && !loading && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 text-lg leading-tight">{req.user.name}</p>
                <p className="text-sm text-gray-500">{req.department.name}</p>
              </div>
              <StatusBadge status={req.status} />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Dage i alt</p>
                <p className="font-semibold text-gray-800">{totalDays} feriedag{totalDays !== 1 ? "e" : ""}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Oprettet</p>
                <p className="text-gray-700">{formatDate(req.createdAt)}</p>
              </div>
              {req.note && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Note</p>
                  <p className="text-gray-700 italic">"{req.note}"</p>
                </div>
              )}
            </div>

            {/* Entries */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Datoer ({req.entries.length})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-3">
                {req.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-gray-800">{formatDate(entry.date)}</span>
                    <span className="text-xs text-gray-400">
                      {ENTRY_TYPE_LABELS[entry.type] ?? entry.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons — stacked on mobile */}
            <div className="space-y-2 pt-1">
              {req.status === "PENDING" && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isPending && <Spinner />}
                    Godkend
                  </button>
                  <button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isPending}
                    className="bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors text-center"
                  >
                    Afvis
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                {["PENDING", "APPROVED"].includes(req.status) && (
                  <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-300 disabled:opacity-50 transition-colors text-center"
                  >
                    Annuller
                  </button>
                )}
                <button
                  onClick={() => setShowEditDialog(true)}
                  className="flex-1 text-sm text-blue-600 hover:text-blue-800 py-2.5 text-center"
                >
                  Rediger note
                </button>
              </div>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            {/* Audit log */}
            {data?.auditLogs && data.auditLogs.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Historik</p>
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
