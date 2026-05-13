import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { isAdmin } from "@/lib/permissions";
import ReportsClient from "./ReportsClient";
import type { SessionUser } from "@/types";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (!isAdmin(user.role)) redirect("/dashboard");

  const currentYear = new Date().getFullYear();

  const [departments, users, requests] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),

    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: { select: { id: true, name: true } },
      },
    }),

    prisma.vacationRequest.findMany({
      where: {
        status: { in: ["APPROVED", "PENDING", "REJECTED", "CANCELLED"] },
      },
      include: {
        entries: { orderBy: { date: "asc" } },
        user: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Serialise dates
  const serializedRequests = requests.map((r) => ({
    id: r.id,
    status: r.status as string,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    userId: r.userId,
    departmentId: r.departmentId,
    user: r.user,
    department: r.department,
    entries: r.entries.map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      type: e.type as string,
      days: e.days,
    })),
  }));

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Rapporter</h1>
          <p className="text-sm text-gray-500 mt-1">Fraværsoversigt, afdelingsstatistik og dataeksport</p>
        </div>
        <ReportsClient
          departments={departments}
          users={users as any}
          requests={serializedRequests}
          currentYear={currentYear}
        />
      </main>
    </div>
  );
}
