"use client";

import { Modal } from "@/components/ui/Modal";
import { Btn } from "@/components/ui/Btn";
import { AlertTriangle } from "lucide-react";

interface CapacityWarningDialogProps {
  open: boolean;
  warning: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function CapacityWarningDialog({ open, warning, onConfirm, onClose }: CapacityWarningDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Kapacitetsadvarsel">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning-bg border border-[rgba(217,119,6,.2)]">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(217,119,6,.15)", color: "var(--c-warning)" }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-warning-text mb-0.5">Afdelingens kapacitetsgrænse er overskredet</p>
            <p className="text-[12px] text-warning-text">{warning}</p>
          </div>
        </div>
        <p className="text-[13px] text-text-muted">
          Godkendelse er ikke gennemført. Bekræft at du vil trumfe kapacitetsadvarslen og godkende ansøgningen alligevel.
        </p>
        <div className="flex gap-2">
          <Btn variant="success" onClick={onConfirm} full>Godkend alligevel</Btn>
          <Btn variant="secondary" onClick={onClose} full>Fortryd</Btn>
        </div>
      </div>
    </Modal>
  );
}
