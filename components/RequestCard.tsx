"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatDate, totalDaysFromEntries, ENTRY_TYPE_LABELS, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/lib/utils";
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState("");

  const sortedEntries = [...request.entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const totalDays = totalDaysFromEntries(request.entries);
  const firstDate = sortedEntries[0]?.date;
  const lastDate = sortedEntries[sortedEntries.length - 1]?.date;

  const absTypes = [...new Set(sortedEntries.map((e) => (e as any).absenceType))];
  const absColor = ABSENCE_TYPE_COLORS[absTypes[0] as string];

  async function handleCancel() {
    setShowCancelConfirm(true);
  }

  async function confirmCancel() {
    setShowCancelConfirm(false);
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

  const dateRange = firstDate && lastDate
    ? firstDate === lastDate
      ? formatDate(firstDate)
      : `${formatDate(firstDate)} – ${formatDate(lastDate)}`
    : "—";

  return (
    <>
      <Card interactive onClick={() => setExpanded(true)} className="p-4">
        <div className="flex items-start gap-3">
          {/* Status dot */}
          <div className="mt-1 w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: absColor?.text ?? "var(--c-text-subtle)" }} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[13px] font-semibold text-text">{dateRange}</span>
              {request.note && (
                <span className="text-[12px] italic text-text-subtle truncate max-w-[200px]">
                  "{request.note}"
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[12px] text-text-muted">
              <span>{totalDays} dag{totalDays !== 1 ? "e" : ""}</span>
              <span>·</span>
              <span>Oprettet {formatDate(request.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {showCancelButton && request.status === "PENDING" && (
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelling}
                className="text-danger hover:text-danger"
              >
                {cancelling ? "..." : "Annuller"}
              </Btn>
            )}
            <StatusBadge status={request.status as any} />
          </div>
        </div>
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      </Card>

      <SlideOver
        open={expanded}
        onClose={() => setExpanded(false)}
        title="Ansøgningsdetaljer"
        subtitle={request.department?.name}
        width={480}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status as any} />
            <span className="text-[12px] text-text-muted">Oprettet {formatDate(request.createdAt)}</span>
          </div>

          {/* Summary grid */}
          <Card className="p-4 bg-bg">
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <p className="text-text-subtle text-[11px] font-bold uppercase tracking-wide mb-0.5">Periode</p>
                <p className="font-semibold text-text">{dateRange}</p>
              </div>
              <div>
                <p className="text-text-subtle text-[11px] font-bold uppercase tracking-wide mb-0.5">Dage</p>
                <p className="font-semibold text-text">{totalDays}</p>
              </div>
            </div>
            {request.note && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-text-subtle text-[11px] font-bold uppercase tracking-wide mb-0.5">Note</p>
                <p className="text-[13px] italic text-text-muted">"{request.note}"</p>
              </div>
            )}
          </Card>

          {/* Entries */}
          <div>
            <SectionLabel>Datolinjer ({sortedEntries.length})</SectionLabel>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {sortedEntries.map((entry) => {
                const ac = ABSENCE_TYPE_COLORS[(entry as any).absenceType];
                return (
                  <div key={entry.id}
                    className="flex items-center justify-between text-[13px] px-3 py-2 rounded-md bg-bg">
                    <span className="text-text">{formatDate(entry.date)}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: ac?.bg ?? "var(--c-bg)", color: ac?.text ?? "var(--c-text-muted)" }}>
                        {ABSENCE_TYPE_LABELS[(entry as any).absenceType] ?? "Ferie"}
                      </span>
                      <span className="text-[11px] text-text-subtle">
                        {ENTRY_TYPE_LABELS[entry.type] ?? entry.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SlideOver>
      <ConfirmDialog
        open={showCancelConfirm}
        title="Annuller ansøgning"
        message="Er du sikker på at du vil annullere denne ansøgning?"
        confirmLabel="Annuller ansøgning"
        onConfirm={confirmCancel}
        onClose={() => setShowCancelConfirm(false)}
      />
    </>
  );
}
