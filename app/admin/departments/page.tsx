import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import DepartmentsClient from "./DepartmentsClient";
import { isAdmin } from "@/lib/permissions";

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!isAdmin(user.role)) redirect("/dashboard");

  const departments = await prisma.department.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} />
      <main className="max-w-2xl mx-auto p-6">
        <DepartmentsClient departments={departments as any} />
      </main>
    </div>
  );
}
