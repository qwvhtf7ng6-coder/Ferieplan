"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RequestCard } from "@/components/RequestCard";
import { cn } from "@/lib/utils";
import type { VacationRequestRow } from "@/types";

const STATUS_OPTIONS = [
  { value: "",            label: "Alle" },
  { value: "PENDING",     label: "Afventer" },
  { value: "APPROVED",    label: "Godkendt" },
  { value: "REJECTED",    label: "Afvist" },
  { value: "CANCELLED",   label: "Annulleret" },
];

interface RequestListProps {
  requests: VacationRequestRow[];
  showCancelButton?: boolean;
  emptyMessage?: string;
}

export function RequestList({ requests, showCancelButton = false, emptyMessage = "Ingen ansøgninger" }: RequestListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [, startTransition] = useTransition();

  const filtered = statusFilter ? requests.filter((r) => r.status === statusFilter) : requests;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-bg mb-4 w-fit flex-wrap">
        {STATUS_OPTIONS.map((opt) => {
          const count = opt.value === "" ? requests.length : requests.filter((r) => r.status === opt.value).length;
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-semibold transition-colors",
                active
                  ? "bg-surface text-text shadow-xs"
                  : "text-text-muted hover:text-text",
              )}
            >
              {opt.label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-bold rounded-full px-1.5 py-0.5",
                  active
                    ? opt.value === "PENDING" ? "bg-warning-bg text-warning-text" : "bg-primary-muted text-primary"
                    : "bg-border text-text-subtle",
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-text-subtle text-[13px]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              showCancelButton={showCancelButton}
              onCancelled={() => startTransition(() => router.refresh())}
            />
          ))}
        </div>
      )}
    </div>
  );
}
