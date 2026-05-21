import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import AdminUsersClient from "./AdminUsersClient";
import { can, buildSubject } from "@/lib/can";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!can(buildSubject(user), "user.view")) redirect("/dashboard");

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      include: { department: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell>
      <main className="max-w-[1100px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <AdminUsersClient
          users={users.map((u: typeof users[0]) => ({ ...u, password: "" }))}
          departments={departments}
        />
      </main>
    </AppShell>
  );
}
