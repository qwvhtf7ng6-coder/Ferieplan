"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RequestCard } from "@/components/RequestCard";
import { StatusBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { VacationRequestRow } from "@/types";

const STATUS_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "PENDING", label: "Afventer" },
  { value: "APPROVED", label: "Godkendt" },
  { value: "REJECTED", label: "Afvist" },
  { value: "CANCELLED", label: "Annulleret" },
];

interface RequestListProps {
  requests: VacationRequestRow[];
  showCancelButton?: boolean;
  emptyMessage?: string;
}

export function RequestList({
  requests,
  showCancelButton = false,
  emptyMessage = "Ingen ansøgninger",
}: RequestListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = statusFilter
    ? requests.filter((r) => r.status === statusFilter)
    : requests;

  function onCancelled() {
    startTransition(() => router.refresh());
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((opt) => {
          const count =
            opt.value === ""
              ? requests.length
              : requests.filter((r) => r.status === opt.value).length;
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                active
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {opt.label}
              {count > 0 && (
                <span className={`ml-1.5 ${active ? "text-gray-300" : "text-gray-400"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {isPending && <Spinner className="text-gray-400" />}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-400 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              showCancelButton={showCancelButton}
              onCancelled={onCancelled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
