"use client";

import { formatDate } from "@/lib/utils";

interface AuditLogEntry {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date;
  user: { name: string };
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE:             { label: "Oprettet",            color: "#4f46e5" },
  CREATED_ON_BEHALF:  { label: "Oprettet på vegne af",color: "#4f46e5" },
  APPROVED:           { label: "Godkendt",            color: "#059669" },
  REJECTED:           { label: "Afvist",              color: "#dc2626" },
  CANCELLED:          { label: "Annulleret",          color: "#9ca3af" },
  EDITED:             { label: "Redigeret",           color: "#d97706" },
  UPDATE:             { label: "Redigeret",           color: "#d97706" },
  DELETE:             { label: "Slettet",             color: "#dc2626" },
  REMINDER:           { label: "Påmindelse",          color: "#d97706" },
};

export function AuditLogPanel({ logs }: { logs: AuditLogEntry[] }) {
  if (logs.length === 0) {
    return <p className="text-[13px] text-text-subtle py-2">Ingen historik endnu.</p>;
  }

  return (
    <ol className="relative space-y-4 pl-5" style={{ borderLeft: "2px solid var(--c-border)" }}>
      {logs.map((log) => {
        const meta = ACTION_LABELS[log.action] ?? { label: "Hændelse", color: "var(--c-text-subtle)" };
        return (
          <li key={log.id} className="relative">
            {/* Timeline dot */}
            <span
              className="absolute -left-[1.45rem] top-1 w-3 h-3 rounded-full border-2"
              style={{
                backgroundColor: meta.color,
                borderColor: "var(--c-surface)",
              }}
            />
            <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-text">{meta.label}</span>
              <span className="text-[11px] text-text-subtle">
                af {log.user.name} · {formatDate(log.createdAt)}
              </span>
            </div>
            {log.details && (
              <p className="text-[12px] rounded-md px-2.5 py-1.5 mt-1"
                style={{
                  background: "var(--c-warning-bg)",
                  color: "var(--c-warning-text)",
                }}>
                {log.details}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
