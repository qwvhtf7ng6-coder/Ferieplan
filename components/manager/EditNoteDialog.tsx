"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";

interface EditNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
  currentNote: string;
}

export function EditNoteDialog({ open, onClose, onConfirm, currentNote }: EditNoteDialogProps) {
  const [note, setNote] = useState(currentNote);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onConfirm(note);
    setLoading(false);
  }

  return (
    <Modal open={open} onClose={onClose} title="Rediger note">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-0.5">{note.length}/500</p>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 flex-1 justify-center bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading && <Spinner />}
            Gem note
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Annuller
          </button>
        </div>
      </form>
    </Modal>
  );
}
