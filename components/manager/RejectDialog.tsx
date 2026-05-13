"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";

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
        <p className="text-sm text-gray-600">
          Du er ved at afvise ferieansøgningen fra{" "}
          <span className="font-semibold">{employeeName}</span>.
        </p>
        <div>
          <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Begrundelse{" "}
            <span className="font-normal text-gray-400">(valgfri)</span>
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="F.eks. for mange allerede godkendt samme periode..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-0.5">{reason.length}/300</p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors text-center"
          >
            Annuller
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 justify-center flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading && <Spinner />}
            Afvis ansøgning
          </button>
        </div>
      </form>
    </Modal>
  );
}
