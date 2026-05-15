"use client";
import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function Toggle({ checked, onChange, disabled, label, description }: ToggleProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 shrink-0 w-11 h-6 rounded-full transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span className={cn(
          "absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )} />
      </button>
      {(label || description) && (
        <div>
          {label && <p className="text-[13px] font-semibold text-text">{label}</p>}
          {description && <p className="text-[12px] text-text-muted mt-0.5">{description}</p>}
        </div>
      )}
    </div>
  );
}
