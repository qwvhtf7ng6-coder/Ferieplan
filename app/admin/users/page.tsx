import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import AdminUsersClient from "./AdminUsersClient";
import { isAdmin } from "@/lib/permissions";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!isAdmin(user.role)) redirect("/dashboard");

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      include: { department: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} />
      <main className="max-w-4xl mx-auto p-6">
        <AdminUsersClient
          users={users.map((u: typeof users[0]) => ({ ...u, password: "" }))}
          departments={departments}
        />
      </main>
    </div>
  );
}
