import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { AppShell } from "@/components/AppShell";
import DepartmentsClient from "./DepartmentsClient";
import { isAdmin } from "@/lib/permissions";
import { isVacationBalanceEnabled } from "@/lib/settings";

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!isAdmin(user.role)) redirect("/dashboard");

  const [departments, balanceEnabled] = await Promise.all([
    prisma.department.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    isVacationBalanceEnabled(),
  ]);

  return (
    <AppShell>
      <Nav role={user.role} name={user.name ?? ""} vacationBalanceEnabled={balanceEnabled} />
      <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <DepartmentsClient departments={departments as any} />
      </main>
    </AppShell>
  );
}
