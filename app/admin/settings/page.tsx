import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import SettingsClient from "./SettingsClient";
import { isAdmin } from "@/lib/permissions";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!isAdmin(user.role)) redirect("/dashboard");

  const settings = await prisma.appSettings.findFirst();

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} />
      <main className="max-w-xl mx-auto p-6">
        <SettingsClient settings={settings as any} />
      </main>
    </div>
  );
}
