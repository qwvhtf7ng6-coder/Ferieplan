import { cn, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
        STATUS_COLORS[status] ?? "bg-bg text-text-muted",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
