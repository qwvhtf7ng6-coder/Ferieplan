import { formatDate } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date;
  user: { name: string };
}

const ACTION_CONFIG: Record<string, {
  label: string;
  icon: string;
  dotColor: string;
  textColor: string;
  bgColor: string;
}> = {
  CREATE: {
    label: "Ansøgning oprettet",
    icon: "✦",
    dotColor: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-100",
  },
  APPROVED: {
    label: "Godkendt",
    icon: "✓",
    dotColor: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50 border-green-100",
  },
  REJECTED: {
    label: "Afvist",
    icon: "✕",
    dotColor: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50 border-red-100",
  },
  CANCELLED: {
    label: "Annulleret",
    icon: "○",
    dotColor: "bg-gray-400",
    textColor: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-200",
  },
  EDITED: {
    label: "Redigeret",
    icon: "✎",
    dotColor: "bg-orange-400",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-100",
  },
  UPDATE: {
    label: "Opdateret",
    icon: "✎",
    dotColor: "bg-orange-400",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-100",
  },
  DELETE: {
    label: "Slettet",
    icon: "✕",
    dotColor: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50 border-red-100",
  },
};

const DEFAULT_CONFIG = {
  label: "Hændelse",
  icon: "·",
  dotColor: "bg-gray-400",
  textColor: "text-gray-600",
  bgColor: "bg-gray-50 border-gray-200",
};

function formatDateTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RequestTimeline({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-sm font-semibold text-gray-700 mb-5">Historik</p>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />

        <ol className="space-y-4">
          {logs.map((log, idx) => {
            const cfg = ACTION_CONFIG[log.action] ?? DEFAULT_CONFIG;
            const isFirst = idx === 0;
            const isLast = idx === logs.length - 1;

            return (
              <li key={log.id} className="relative flex gap-4 pl-9">
                {/* Dot */}
                <div
                  className={`absolute left-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${cfg.dotColor} ${isFirst ? "ring-2 ring-offset-2 ring-blue-200" : ""}`}
                >
                  {cfg.icon}
                </div>

                {/* Content */}
                <div className={`flex-1 rounded-xl border px-4 py-3 ${cfg.bgColor} ${isLast && logs.length === 1 ? "" : ""}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${cfg.textColor}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    af <span className="font-medium text-gray-700">{log.user.name}</span>
                  </p>
                  {log.details && (
                    <p className="text-xs mt-1.5 italic text-gray-600 bg-white/60 rounded-lg px-2 py-1 border border-white">
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
