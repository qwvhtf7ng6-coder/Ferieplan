"use client";

import { Modal } from "@/components/ui/Modal";

interface CapacityWarningDialogProps {
  open: boolean;
  warning: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function CapacityWarningDialog({
  open,
  warning,
  onConfirm,
  onClose,
}: CapacityWarningDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Kapacitetsadvarsel">
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex gap-3">
            <span className="text-orange-500 text-xl shrink-0">⚠</span>
            <div>
              <p className="text-sm font-semibold text-orange-800 mb-1">
                Afdelingens kapacitetsgrænse er overskredet
              </p>
              <p className="text-sm text-orange-700">{warning}</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Du kan stadig godkende ansøgningen. Kapacitetsgrænsen er vejledende og
          kan overskrides efter vurdering.
        </p>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onConfirm}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Godkend alligevel
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Fortryd
          </button>
        </div>
      </div>
    </Modal>
  );
}
