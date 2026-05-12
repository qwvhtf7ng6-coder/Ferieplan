"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Nav from "@/components/Nav";
import { formatDate, STATUS_LABELS, STATUS_COLORS, cn } from "@/lib/utils";

interface Request {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  user: { name: string; email: string };
  department: { name: string };
  entries: { date: string; type: string; days: number }[];
  capacityWarning?: string;
}

export default function ManagerRequestsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [requests, setRequests] = useState<Request[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [warning, setWarning] = useState<{ id: string; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/requests?${params}`);
    const data = await res.json();
    setRequests(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function updateStatus(id: string, status: string, force = false) {
    setActionLoading(id);
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();

    if (data.capacityWarning && !force) {
      setWarning({ id, msg: data.capacityWarning });
    } else {
      setWarning(null);
    }
    await load();
    setActionLoading(null);
  }

  if (!session) return null;

  return (
    <div>
      <Nav role={user?.role} name={user?.name ?? ""} />
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-xl font-bold text-gray-800">Afdelingsansøgninger</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="">Alle statusser</option>
            <option value="PENDING">Afventer</option>
            <option value="APPROVED">Godkendt</option>
            <option value="REJECTED">Afvist</option>
            <option value="CANCELLED">Annulleret</option>
          </select>
        </div>

        {warning && (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 mb-4 text-sm text-orange-800">
            ⚠️ {warning.msg} — Godkendelse er stadig mulig.
            <button onClick={() => setWarning(null)} className="ml-2 text-orange-600 underline">Ok</button>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Indlæser...</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-500 text-sm">Ingen ansøgninger.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const dates = req.entries.map((e) => new Date(e.date)).sort((a, b) => +a - +b);
              const totalDays = req.entries.reduce((s, e) => s + e.days, 0);
              return (
                <div key={req.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-800">{req.user.name}</span>
                        <span className="text-xs text-gray-500">{req.department.name}</span>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[req.status])}>
                          {STATUS_LABELS[req.status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {dates.length > 0 && `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {totalDays} dag{totalDays !== 1 ? "e" : ""}
                        {req.note && ` • "${req.note}"`}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {req.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => updateStatus(req.id, "APPROVED")}
                            disabled={actionLoading === req.id}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            Godkend
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, "REJECTED")}
                            disabled={actionLoading === req.id}
                            className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50"
                          >
                            Afvis
                          </button>
                        </>
                      )}
                      {(req.status === "APPROVED" || req.status === "PENDING") && (
                        <button
                          onClick={() => updateStatus(req.id, "CANCELLED")}
                          disabled={actionLoading === req.id}
                          className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300 disabled:opacity-50"
                        >
                          Annuller
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
