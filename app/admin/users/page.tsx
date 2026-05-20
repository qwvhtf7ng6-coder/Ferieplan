import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { AppShell } from "@/components/AppShell";
import AdminUsersClient from "./AdminUsersClient";
import { isAdmin } from "@/lib/permissions";
import { isVacationBalanceEnabled } from "@/lib/settings";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!isAdmin(user.role)) redirect("/dashboard");

  const [users, departments, balanceEnabled] = await Promise.all([
    prisma.user.findMany({
      include: { department: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    isVacationBalanceEnabled(),
  ]);

  return (
    <AppShell>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} vacationBalanceEnabled={balanceEnabled} />
      <main className="max-w-[1100px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <AdminUsersClient
          users={users.map((u: typeof users[0]) => ({ ...u, password: "" }))}
          departments={departments}
        />
      </main>
    </AppShell>
  );
}
