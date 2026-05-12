import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { RequestFilters } from "@/components/manager/RequestFilters";
import { ManagerRequestsClient } from "./ManagerRequestsClient";
import { getManagerRequests } from "@/actions/manager";
import { isManager, isAdmin } from "@/lib/permissions";
import type { SessionUser } from "@/types";

export default async function ManagerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    month?: string;
    year?: string;
    departmentId?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (!isManager(user.role)) redirect("/dashboard");

  const sp = await searchParams;

  const departments = isAdmin(user.role)
    ? await prisma.department.findMany({ orderBy: { name: "asc" } })
    : [];

  const result = await getManagerRequests({
    status: sp.status,
    month: sp.month ? parseInt(sp.month) : undefined,
    year: sp.year ? parseInt(sp.year) : undefined,
    departmentId: sp.departmentId,
  });

  const requests = result.ok ? result.data ?? [] : [];
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ferieansøgninger</h1>
            <p className="text-sm text-gray-500 mt-1">
              {requests.length} ansøgning{requests.length !== 1 ? "er" : ""}
              {pendingCount > 0 && (
                <span className="ml-2 text-yellow-700 font-medium">
                  · {pendingCount} afventer godkendelse
                </span>
              )}
            </p>
          </div>
        </div>

        <RequestFilters
          departments={departments}
          showDeptFilter={isAdmin(user.role)}
        />

        <ManagerRequestsClient requests={requests} />
      </main>
    </div>
  );
}
