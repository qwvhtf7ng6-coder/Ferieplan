"use client";

import { useState } from "react";
import { ManagerRequestRow } from "@/components/manager/ManagerRequestRow";
import { RequestDetailModal } from "@/components/manager/RequestDetailModal";
import type { VacationRequestRow } from "@/types";

interface ManagerRequestsClientProps {
  requests: VacationRequestRow[];
}

export function ManagerRequestsClient({ requests }: ManagerRequestsClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-subtle text-sm">Ingen ansøgninger matcher de valgte filtre.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((req) => (
          <ManagerRequestRow
            key={req.id}
            request={req}
            onOpenDetail={setSelectedId}
          />
        ))}
      </div>

      <RequestDetailModal
        requestId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
