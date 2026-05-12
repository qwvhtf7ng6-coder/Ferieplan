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
  CREATE:    { label: "Oprettet",   color: "bg-blue-500" },
  APPROVED:  { label: "Godkendt",   color: "bg-green-500" },
  REJECTED:  { label: "Afvist",     color: "bg-red-500" },
  CANCELLED: { label: "Annulleret", color: "bg-gray-400" },
  EDITED:    { label: "Redigeret",  color: "bg-yellow-500" },
  UPDATE:    { label: "Opdateret",  color: "bg-yellow-500" },
  DELETE:    { label: "Slettet",    color: "bg-red-700" },
};

interface AuditLogPanelProps {
  logs: AuditLogEntry[];
}

export function AuditLogPanel({ logs }: AuditLogPanelProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-400 py-2">Ingen historik endnu.</p>;
  }

  return (
    <ol className="relative border-l-2 border-gray-100 space-y-4 pl-5">
      {logs.map((log) => {
        const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-gray-400" };
        return (
          <li key={log.id} className="relative">
            <span
              className={`absolute -left-[1.45rem] top-1 w-3 h-3 rounded-full border-2 border-white ${meta.color}`}
            />
            <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
              <span className="text-sm font-semibold text-gray-800">{meta.label}</span>
              <span className="text-xs text-gray-400">
                af {log.user.name} · {formatDate(log.createdAt)}
              </span>
            </div>
            {log.details && (
              <p className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-1 mt-1">
                {log.details}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
