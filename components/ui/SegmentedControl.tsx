"use client";

import { cn } from "@/lib/utils";

/**
 * SegmentedControl — eksklusiv 2–4 valgs-knapgruppe med pille-baggrund.
 *
 * Design (jf. DESIGN.md):
 *  - Container: bg-bg + 1px border + radius-md
 *  - Aktivt segment: surface-baggrund + primær tekstfarve + skygge-xs
 *  - Inaktivt segment: text-muted, hover → text
 *  - Transitions: kun color/bg
 *  - Hele kontrolen sidder i én vandret række; segmenter har samme bredde
 *
 * Brug:
 *   <SegmentedControl
 *     options={[
 *       { value: "NONE",            label: "Ingen" },
 *       { value: "OWN_DEPARTMENT",  label: "Egen afdeling" },
 *       { value: "ALL",             label: "Alle" },
 *     ]}
 *     value={scope}
 *     onChange={setScope}
 *   />
 */

interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Mindre størrelse til brug inde i kompakte rækker. Default "md". */
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
}: SegmentedControlProps<T>) {
  const segPadding = size === "sm" ? "py-1 px-2.5 text-[11px]" : "py-1.5 px-3 text-[12px]";

  return (
    <div
      role="radiogroup"
      className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-bg"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded font-semibold transition-colors duration-150 whitespace-nowrap",
              segPadding,
              isActive
                ? "bg-surface text-primary shadow-xs"
                : "text-text-muted hover:text-text",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
