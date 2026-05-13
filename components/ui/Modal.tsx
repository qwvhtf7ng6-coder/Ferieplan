"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      // Lock body scroll
      document.body.style.overflow = "hidden";
      // Focus the panel
      setTimeout(() => panelRef.current?.focus(), 0);
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        className={cn(
          // Full-width bottom sheet on mobile, centered card on desktop
          "bg-white w-full sm:rounded-xl shadow-xl outline-none",
          "rounded-t-2xl sm:rounded-xl",
          "max-h-[90dvh] sm:max-h-[85vh]",
          "flex flex-col",
          "sm:w-full sm:max-w-md",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            {/* Drag handle indicator on mobile */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300 sm:hidden" aria-hidden="true" />
            <h2 id="modal-title" className="font-bold text-gray-800 text-base">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xl leading-none"
              aria-label="Luk"
            >
              ×
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
