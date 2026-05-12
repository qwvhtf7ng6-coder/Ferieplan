import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import HolidaysClient from "./HolidaysClient";
import { isAdmin } from "@/lib/permissions";

export default async function HolidaysPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!isAdmin(user.role)) redirect("/dashboard");

  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} />
      <main className="max-w-2xl mx-auto p-6">
        <HolidaysClient holidays={holidays as any} />
      </main>
    </div>
  );
}
