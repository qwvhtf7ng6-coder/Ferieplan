"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Btn } from "@/components/ui/Btn";
import { X } from "lucide-react";

interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  employeeName: string;
}

export function RejectDialog({ open, onClose, onConfirm, employeeName }: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
    setReason("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Afvis ansøgning">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-[13px] text-text-muted">
          Du er ved at afvise ansøgningen fra{" "}
          <span className="font-semibold text-text">{employeeName}</span>.
        </p>
        <div>
          <label htmlFor="reject-reason" className="block text-[13px] font-semibold text-text mb-1">
            Begrundelse <span className="font-normal text-text-subtle">(valgfri)</span>
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="F.eks. for mange allerede godkendt samme periode..."
            className="w-full border-[1.5px] border-border rounded-md px-3.5 py-2.5 text-sm bg-surface text-text placeholder:text-text-subtle focus:outline-none focus:border-danger focus:ring-[3px] focus:ring-[rgba(220,38,38,.12)] resize-none"
          />
          <p className="text-[11px] text-text-subtle text-right mt-0.5">{reason.length}/300</p>
        </div>
        <div className="flex gap-2">
          <Btn type="submit" variant="danger" disabled={loading} icon={<X size={14} />} full>
            {loading ? "Afviser..." : "Afvis ansøgning"}
          </Btn>
          <Btn type="button" variant="secondary" onClick={onClose} full>Annuller</Btn>
        </div>
      </form>
    </Modal>
  );
}
