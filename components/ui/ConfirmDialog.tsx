"use client";

import { Modal } from "@/components/ui/Modal";
import { Btn } from "@/components/ui/Btn";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = "Bekræft",
  cancelLabel = "Annuller",
  variant = "danger",
  onConfirm, onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-lg"
          style={{
            background: variant === "danger" ? "var(--c-danger-bg)" : "var(--c-warning-bg)",
            border: `1px solid ${variant === "danger" ? "rgba(220,38,38,.2)" : "rgba(217,119,6,.2)"}`,
          }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: variant === "danger" ? "rgba(220,38,38,.15)" : "rgba(217,119,6,.15)",
              color: variant === "danger" ? "var(--c-danger)" : "var(--c-warning)",
            }}>
            <AlertTriangle size={18} />
          </div>
          <p className="text-[13px] leading-relaxed"
            style={{ color: variant === "danger" ? "var(--c-danger-text)" : "var(--c-warning-text)" }}>
            {message}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant={variant === "danger" ? "danger" : "secondary"} onClick={onConfirm} full>{confirmLabel}</Btn>
          <Btn variant="secondary" onClick={onClose} full>{cancelLabel}</Btn>
        </div>
      </div>
    </Modal>
  );
}
