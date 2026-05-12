import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Link from "next/link";
import { formatDate, STATUS_LABELS, STATUS_COLORS, cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  const requests = await prisma.vacationRequest.findMany({
    where: { userId: user.id },
    include: { entries: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} />
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Mine ferieansøgninger</h1>
          <Link
            href="/requests/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Ny ansøgning
          </Link>
        </div>

        {requests.length === 0 ? (
          <p className="text-gray-500 text-sm">Ingen ansøgninger endnu.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req: (typeof requests)[0]) => {
              const dates = req.entries.map((e: { date: Date }) => new Date(e.date)).sort((a: Date, b: Date) => +a - +b);
              const totalDays = req.entries.reduce((s: number, e: { days: number }) => s + e.days, 0);
              return (
                <div key={req.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={cn(
                          "inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1",
                          STATUS_COLORS[req.status]
                        )}
                      >
                        {STATUS_LABELS[req.status]}
                      </span>
                      <p className="text-sm text-gray-700">
                        {dates.length > 0 &&
                          `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {totalDays} dag{totalDays !== 1 ? "e" : ""} • {req.entries.length} periode(r)
                      </p>
                      {req.note && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{req.note}"</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(req.createdAt)}</span>
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
