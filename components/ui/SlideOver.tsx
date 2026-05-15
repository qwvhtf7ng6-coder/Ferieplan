"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: number;
}

export function SlideOver({ open, onClose, title, subtitle, children, width = 500 }: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-end transition-opacity duration-200",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "relative flex flex-col h-full bg-surface shadow-lg transition-transform duration-[280ms] ease-[cubic-bezier(.4,0,.2,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{ width: `min(${width}px, 100vw)` }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 py-5 border-b border-border bg-surface">
          <div>
            <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-text">{title}</h2>
            {subtitle && <p className="text-[13px] text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg transition-colors"
            aria-label="Luk"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
