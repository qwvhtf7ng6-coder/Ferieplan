"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { SlideOver } from "@/components/ui/SlideOver";
import { Btn } from "@/components/ui/Btn";
import { Toggle } from "@/components/ui/Toggle";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";

import type { Permissions, PermissionKey, Scope } from "@/lib/permission-types";
import {
  SCOPE_PERMISSION_KEYS,
  BOOL_PERMISSION_KEYS,
  isScopePermission,
} from "@/lib/permission-types";
import { defaultsForRole } from "@/lib/permission-defaults";
import { PERMISSION_GROUPS, PERMISSION_LABELS, SCOPE_LABELS } from "@/lib/permission-labels";
import type { UserRole } from "@/lib/permissions";

interface PermissionsEditorProps {
  open: boolean;
  onClose: () => void;
  /** Den bruger der redigeres — vises i header for kontekst. */
  userName: string;
  userRole: UserRole;
  /**
   * Nuværende effektive tilladelser for brugeren (defaults merget med
   * eventuelle gemte overrides). Bruges som startværdi og som "før"-snapshot.
   */
  initial: Permissions;
  /**
   * Callback når admin trykker Gem. Modtager hele Permissions-objektet — kalderen
   * (AdminUsersClient) sender det videre til API'et. Lukker selv slide-overen
   * efter successful gem ved at kalde onClose.
   */
  onSave: (next: Permissions) => Promise<void> | void;
  /**
   * Callback når admin vælger "Nulstil til rolle-defaults". Sender et eksplicit
   * null-signal til kalderen som så fjerner DB-overrides — så brugeren fremover
   * arver alle ændringer i rolle-defaults. Skiller sig fra at gemme et fuldt
   * objekt der tilfældigvis matcher defaults.
   */
  onResetToRoleDefaults: () => void;
}

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "NONE",           label: SCOPE_LABELS.NONE },
  { value: "OWN_DEPARTMENT", label: SCOPE_LABELS.OWN_DEPARTMENT },
  { value: "ALL",            label: SCOPE_LABELS.ALL },
];

/**
 * Bygger initial-state ved at sikre at ALLE 23 nøgler er udfyldt med en
 * gyldig værdi — selv om props.initial skulle være partial.
 */
function fullStateFromInitial(initial: Permissions, role: UserRole): Permissions {
  const defaults = defaultsForRole(role);
  const out = { ...defaults } as Record<string, unknown>;
  for (const k of SCOPE_PERMISSION_KEYS) {
    if (initial[k] !== undefined) out[k] = initial[k];
  }
  for (const k of BOOL_PERMISSION_KEYS) {
    if (initial[k] !== undefined) out[k] = initial[k];
  }
  return out as Permissions;
}

export function PermissionsEditor({
  open,
  onClose,
  userName,
  userRole,
  initial,
  onSave,
  onResetToRoleDefaults,
}: PermissionsEditorProps) {
  const defaults = useMemo(() => defaultsForRole(userRole), [userRole]);

  // Editor-state: hele Permissions-objektet, initialiseret fra prop.
  const [draft, setDraft] = useState<Permissions>(() => fullStateFromInitial(initial, userRole));

  // Re-syncronisér draft når slide-overen åbnes eller initial/userRole
  // ændres. SlideOver fjerner ikke children fra DOM ved !open — den skjuler
  // dem via opacity — så uden denne useEffect ville draft holde fast i den
  // gamle state mellem åbninger. Vi nulstiller kun ved åbning, ikke under
  // redigering (ellers ville hver tastetryk smide ændringerne).
  useEffect(() => {
    if (open) {
      setDraft(fullStateFromInitial(initial, userRole));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userRole]);

  // Hvilke grupper er udfoldet? Default: alle lukket — admin åbner kun det
  // de skal ændre. Holder slide-overen kompakt selv med 8 grupper.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleGroup = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Antal nøgler hvor draft afviger fra rolle-defaults — vises i header.
  const changedCount = useMemo(() => {
    let n = 0;
    for (const k of SCOPE_PERMISSION_KEYS) {
      if (draft[k] !== defaults[k]) n++;
    }
    for (const k of BOOL_PERMISSION_KEYS) {
      if (draft[k] !== defaults[k]) n++;
    }
    return n;
  }, [draft, defaults]);

  // Antal ændringer pr. gruppe — bruges som badge i accordion-headeren.
  const changedPerGroup = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of PERMISSION_GROUPS) {
      let n = 0;
      for (const key of g.keys) {
        if (draft[key] !== defaults[key]) n++;
      }
      map[g.id] = n;
    }
    return map;
  }, [draft, defaults]);

  function setPermission<K extends PermissionKey>(key: K, value: Permissions[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function resetAllToDefaults() {
    setDraft({ ...defaults });
    // Signaler eksplicit til kalderen at vi vil arve rolle-defaults
    // (sender null til API i stedet for et fuldt objekt). Det betyder
    // brugeren også fremover følger ændringer i rolle-defaults.
    onResetToRoleDefaults();
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Kunne ikke gemme tilladelser");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Tilpas tilladelser"
      subtitle={userName}
      width={600}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={saving}>
            Annullér
          </Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? "Gemmer…" : "Gem tilladelser"}
          </Btn>
        </div>
      }
    >
      {/* Hele indholdet ligger inde i SlideOver's scrollable body; den
          sticky footer kommer fra footer-prop'en ovenfor. -mx-6 -my-6
          trækker topbjælken ud til kanterne for visuelt at adskille den
          fra det scrollable indhold under. */}
      <div className="-mx-6 -mt-6">

        {/* Topbjælke med "Ændret"-status + "Nulstil til rolle-defaults".
            Sticky så den følger med når admin scroller gennem grupperne. */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-border bg-bg">
          <div className="text-[12px]">
            {changedCount === 0 ? (
              <span className="text-text-subtle">
                Tilladelser følger rolle-defaults for <span className="font-semibold text-text-muted">{userRole.toLowerCase()}</span>.
              </span>
            ) : (
              <span className="text-text-muted">
                <span className="font-bold text-primary">{changedCount}</span>{" "}
                ændring{changedCount !== 1 ? "er" : ""} fra rolle-defaults
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={resetAllToDefaults}
            disabled={changedCount === 0}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-muted hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw size={12} />
            Brug rolle-defaults
          </button>
        </div>

        {/* Accordion-grupper */}
        <div className="px-6 py-4 space-y-2">
          {PERMISSION_GROUPS.map((group) => {
            const isExpanded = expanded[group.id] ?? false;
            const changes = changedPerGroup[group.id];
            return (
              <div
                key={group.id}
                className="rounded-lg border border-border bg-surface overflow-hidden"
              >
                {/* Gruppe-header — toggle expand */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg transition-colors"
                >
                  <div className="text-left">
                    <p className="text-[13px] font-bold text-text">{group.label}</p>
                    <p className="text-[11px] text-text-subtle mt-0.5">{group.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {changes > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary-muted text-primary text-[10px] font-bold">
                        {changes}
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      className={cn(
                        "text-text-subtle transition-transform duration-150",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>
                </button>

                {/* Udfoldede tilladelses-rækker */}
                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {group.keys.map((key) => (
                      <PermissionRow
                        key={key}
                        permKey={key}
                        value={draft[key]}
                        defaultValue={defaults[key]}
                        onChange={(v) => setPermission(key, v as Permissions[typeof key])}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {error && (
            <div className="rounded-md border border-danger-bg bg-danger-bg px-3 py-2 text-[12px] text-danger-text">
              {error}
            </div>
          )}
        </div>
      </div>
    </SlideOver>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

interface PermissionRowProps {
  permKey: PermissionKey;
  value: Scope | boolean;
  defaultValue: Scope | boolean;
  onChange: (v: Scope | boolean) => void;
}

function PermissionRow({ permKey, value, defaultValue, onChange }: PermissionRowProps) {
  const meta = PERMISSION_LABELS[permKey];
  const isChanged = value !== defaultValue;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-text">{meta.label}</p>
          {isChanged && (
            <span className="inline-flex items-center px-1.5 h-[16px] rounded-full bg-primary-muted text-primary text-[9px] font-bold uppercase tracking-wide">
              Ændret
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-subtle mt-0.5">{meta.description}</p>
      </div>
      <div className="shrink-0">
        {isScopePermission(permKey) ? (
          <SegmentedControl
            size="sm"
            options={SCOPE_OPTIONS}
            value={value as Scope}
            onChange={onChange}
          />
        ) : (
          <Toggle
            checked={value as boolean}
            onChange={onChange}
          />
        )}
      </div>
    </div>
  );
}
