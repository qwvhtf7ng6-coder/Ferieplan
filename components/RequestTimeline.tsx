import { formatDate } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date;
  user: { name: string };
}

const ACTION_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; textColor: string }> = {
  CREATE:            { label: "Ansøgning oprettet",     icon: "✦", color: "var(--c-primary)",  bg: "var(--c-primary-muted)",  textColor: "var(--c-primary)" },
  CREATED_ON_BEHALF: { label: "Oprettet på vegne af",   icon: "✦", color: "var(--c-primary)",  bg: "var(--c-primary-muted)",  textColor: "var(--c-primary)" },
  APPROVED:          { label: "Godkendt",               icon: "✓", color: "var(--c-success)",  bg: "var(--c-success-bg)",     textColor: "var(--c-success-text)" },
  REJECTED:          { label: "Afvist",                 icon: "✕", color: "var(--c-danger)",   bg: "var(--c-danger-bg)",      textColor: "var(--c-danger-text)" },
  CANCELLED:         { label: "Annulleret",             icon: "○", color: "var(--c-text-subtle)", bg: "var(--c-bg)",           textColor: "var(--c-text-muted)" },
  EDITED:            { label: "Redigeret",              icon: "✎", color: "var(--c-warning)",  bg: "var(--c-warning-bg)",     textColor: "var(--c-warning-text)" },
  UPDATE:            { label: "Opdateret",              icon: "✎", color: "var(--c-warning)",  bg: "var(--c-warning-bg)",     textColor: "var(--c-warning-text)" },
  DELETE:            { label: "Slettet",                icon: "✕", color: "var(--c-danger)",   bg: "var(--c-danger-bg)",      textColor: "var(--c-danger-text)" },
  REMINDER:          { label: "Påmindelse",             icon: "⏰", color: "var(--c-warning)",  bg: "var(--c-warning-bg)",     textColor: "var(--c-warning-text)" },
};

const DEFAULT_CONFIG = { label: "Hændelse", icon: "·", color: "var(--c-text-subtle)", bg: "var(--c-bg)", textColor: "var(--c-text-muted)" };

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("da-DK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function RequestTimeline({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <p className="text-[13px] font-bold text-text mb-5">Historik</p>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />

        <ol className="space-y-4">
          {logs.map((log, idx) => {
            const cfg = ACTION_CONFIG[log.action] ?? DEFAULT_CONFIG;
            const isFirst = idx === 0;
            return (
              <li key={log.id} className="relative flex gap-4 pl-9">
                {/* Dot */}
                <div
                  className="absolute left-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                  style={{
                    backgroundColor: cfg.color,
                    boxShadow: isFirst ? `0 0 0 3px var(--c-surface), 0 0 0 5px ${cfg.color}44` : undefined,
                  }}
                >
                  {cfg.icon}
                </div>

                {/* Content card */}
                <div className="flex-1 rounded-lg border px-4 py-3"
                  style={{ backgroundColor: cfg.bg, borderColor: `${cfg.color}33` }}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold" style={{ color: cfg.textColor }}>
                      {cfg.label}
                    </span>
                    <span className="text-[11px] text-text-subtle whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-[12px] text-text-muted mt-0.5">
                    af <span className="font-semibold text-text">{log.user.name}</span>
                  </p>
                  {log.details && (
                    <p className="text-[12px] mt-1.5 italic text-text-muted bg-surface/60 rounded-md px-2 py-1">
                      {log.details}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
