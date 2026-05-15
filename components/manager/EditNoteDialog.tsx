"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Btn } from "@/components/ui/Btn";

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
          <label className="block text-[13px] font-semibold text-text mb-1">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full border-[1.5px] border-border rounded-md px-3.5 py-2.5 text-sm bg-surface text-text placeholder:text-text-subtle focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,.12)] resize-none"
          />
          <p className="text-[11px] text-text-subtle text-right mt-0.5">{note.length}/500</p>
        </div>
        <div className="flex gap-2">
          <Btn type="submit" disabled={loading} full>{loading ? "Gemmer..." : "Gem note"}</Btn>
          <Btn type="button" variant="secondary" onClick={onClose} full>Annuller</Btn>
        </div>
      </form>
    </Modal>
  );
}
