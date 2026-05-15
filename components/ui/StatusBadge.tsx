import { cn } from "@/lib/utils";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

const styles: Record<Status, string> = {
  PENDING:   "bg-[var(--c-warning-bg)] text-[var(--c-warning-text)]",
  APPROVED:  "bg-[var(--c-success-bg)] text-[var(--c-success-text)]",
  REJECTED:  "bg-[var(--c-danger-bg)]  text-[var(--c-danger-text)]",
  CANCELLED: "bg-bg text-text-subtle",
};

const labels: Record<Status, string> = {
  PENDING:   "Afventer",
  APPROVED:  "Godkendt",
  REJECTED:  "Afvist",
  CANCELLED: "Annulleret",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide whitespace-nowrap",
      styles[status],
      className,
    )}>
      {labels[status]}
    </span>
  );
}
