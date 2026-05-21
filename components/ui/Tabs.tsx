"use client";

import { cn } from "@/lib/utils";

/**
 * Tabs — vandret tab-bar med diskret underline-indikator.
 *
 * Design (jf. DESIGN.md):
 *  - 1px border-b under hele tab-rækken (matcher de subtile borders)
 *  - Aktiv tab har 2px primær-farvet underline + primær tekstfarve, font-weight 700
 *  - Inaktiv tab har text-muted, font-weight 600
 *  - Transitions: kun color/bg/border (ingen scale/translate)
 *  - Tab-padding: 12px horizontalt, 10px vertikalt (kompakt, matcher card-density)
 *
 * Brug:
 *   <Tabs
 *     tabs={[
 *       { id: "profile", label: "Profil" },
 *       { id: "access",  label: "Adgang" },
 *     ]}
 *     active="profile"
 *     onChange={setActive}
 *   />
 */

export interface TabDef<T extends string = string> {
  id: T;
  label: string;
  /** Valgfri talindikator vist som lille pille bag labelet (fx antal ændringer). */
  badge?: number | string;
}

interface TabsProps<T extends string = string> {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function Tabs<T extends string = string>({ tabs, active, onChange }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className="flex items-end gap-0 border-b border-border -mx-6 px-6"
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] transition-colors duration-150",
              "border-b-2 -mb-px",
              isActive
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-muted font-semibold hover:text-text",
            )}
          >
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge !== 0 && t.badge !== "" && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold",
                  isActive
                    ? "bg-primary text-white"
                    : "bg-bg text-text-muted",
                )}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
