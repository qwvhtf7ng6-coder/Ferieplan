import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { formatDate, ENTRY_TYPE_LABELS, totalDaysFromEntries } from "@/lib/utils";
import type { SessionUser } from "@/types";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const { id } = await params;

  const request = await prisma.vacationRequest.findUnique({
    where: { id },
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true, maxConcurrent: true } },
      auditLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!request) notFound();

  // Employees can only see their own
  if (user.role === "EMPLOYEE" && request.userId !== user.id) {
    redirect("/dashboard");
  }

  const totalDays = totalDaysFromEntries(
    request.entries.map((e: { days: number }) => ({ days: e.days }))
  );

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Ansøgning</h1>
          <StatusBadge status={request.status} />
        </div>

        <div className="space-y-4">
          {/* Info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Medarbejder</p>
                <p className="font-medium text-gray-800">{request.user.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Afdeling</p>
                <p className="font-medium text-gray-800">{request.department.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Oprettet</p>
                <p className="text-gray-700">{formatDate(request.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Feriedage i alt</p>
                <p className="font-semibold text-gray-800">
                  {totalDays} dag{totalDays !== 1 ? "e" : ""}
                </p>
              </div>
            </div>

            {request.note && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Note</p>
                <p className="text-sm text-gray-700 italic">"{request.note}"</p>
              </div>
            )}
          </div>

          {/* Entries */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Datolinjer ({request.entries.length})
            </p>
            <div className="space-y-1">
              {request.entries.map((entry: { id: string; date: Date; type: string; days: number }) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm"
                >
                  <span className="text-gray-800">{formatDate(entry.date)}</span>
                  <div className="flex items-center gap-3 text-gray-500 text-xs">
                    <span>{ENTRY_TYPE_LABELS[entry.type] ?? entry.type}</span>
                    <span className="font-medium">
                      {entry.days} dag{entry.days !== 1 ? "e" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit log */}
          {request.auditLogs.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Historik</p>
              <ol className="relative border-l border-gray-200 space-y-3 pl-4">
                {request.auditLogs.map((log: { id: string; action: string; details: string | null; createdAt: Date; user: { name: string } }) => (
                  <li key={log.id}>
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-gray-300 border-2 border-white" />
                    <p className="text-xs text-gray-500">
                      {formatDate(log.createdAt)} · {log.user.name}
                    </p>
                    <p className="text-sm text-gray-800 font-medium">{log.action}</p>
                    {log.details && (
                      <p className="text-xs text-orange-700 mt-0.5">{log.details}</p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
