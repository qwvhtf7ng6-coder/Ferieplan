import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { RequestList } from "@/components/RequestList";
import { getMyRequests } from "@/actions/requests";
import type { SessionUser } from "@/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const result = await getMyRequests();
  const requests = result.ok ? result.data ?? [] : [];

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mine feriedage</h1>
            <p className="text-sm text-gray-500 mt-1">
              {user.name} · {requests.length} ansøgning{requests.length !== 1 ? "er" : ""}
            </p>
          </div>
          <Link
            href="/requests/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            + Ny ansøgning
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard label="Afventer" value={pendingCount} color="text-yellow-600" />
          <StatCard label="Godkendt" value={approvedCount} color="text-green-600" />
          <StatCard
            label="I alt"
            value={requests.reduce(
              (sum, r) =>
                r.status === "APPROVED"
                  ? sum + r.entries.reduce((s, e) => s + e.days, 0)
                  : sum,
              0
            )}
            label2="godkendte dage"
            color="text-blue-600"
          />
        </div>

        {/* List */}
        <RequestList
          requests={requests}
          showCancelButton
          emptyMessage="Du har ingen ferieansøgninger endnu."
        />
      </main>
    </div>
  );
}

function StatCard({
  label,
  label2,
  value,
  color,
}: {
  label: string;
  label2?: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label2 ?? label}</p>
    </div>
  );
}
