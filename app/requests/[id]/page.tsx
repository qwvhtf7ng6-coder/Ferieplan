import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { formatDate, ENTRY_TYPE_LABELS, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS, totalDaysFromEntries } from "@/lib/utils";
import { canSeeCalendar, canSeeShifts } from "@/lib/settings";
import { RequestTimeline } from "@/components/RequestTimeline";
import type { SessionUser } from "@/types";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const [{ id }, calendarVisible, shiftsVisible] = await Promise.all([
    params,
    canSeeCalendar(user.role),
    canSeeShifts(user.role, user.departmentId),
  ]);

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

  if (user.role === "EMPLOYEE" && request.userId !== user.id) {
    redirect("/dashboard");
  }

  const totalDays = totalDaysFromEntries(
    request.entries.map((e: { days: number }) => ({ days: e.days }))
  );

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={calendarVisible} shiftsVisible={shiftsVisible} />
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
                <p className="text-xs text-gray-400 mb-0.5">Dage i alt</p>
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

            {request.status === "REJECTED" && (request as any).rejectionReason && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-red-400 mb-1 font-medium">Begrundelse for afvisning</p>
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <p className="text-sm text-red-800 italic">"{(request as any).rejectionReason}"</p>
                </div>
              </div>
            )}
          </div>

          {/* Entries */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Datolinjer ({request.entries.length})
            </p>
            <div className="space-y-1">
              {request.entries.map((entry: { id: string; date: Date; type: string; absenceType: string; days: number }) => {
                const absColor = ABSENCE_TYPE_COLORS[entry.absenceType];
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm"
                  >
                    <span className="text-gray-800">{formatDate(entry.date)}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: absColor?.bg ?? "#f3f4f6", color: absColor?.text ?? "#374151" }}
                      >
                        {ABSENCE_TYPE_LABELS[entry.absenceType] ?? entry.absenceType}
                      </span>
                      <span className="text-xs text-gray-400">
                        {ENTRY_TYPE_LABELS[entry.type] ?? entry.type}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        {entry.days} dag{entry.days !== 1 ? "e" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <RequestTimeline logs={request.auditLogs} />
        </div>
      </main>
    </div>
  );
}
