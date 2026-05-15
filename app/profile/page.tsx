import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { ProfileClient } from "./ProfileClient";
import { getCalendarVisibility, canSeeShifts } from "@/lib/settings";
import { isManager } from "@/lib/permissions";
import type { SessionUser } from "@/types";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const [visibility, shiftsVisible] = await Promise.all([
    getCalendarVisibility(),
    canSeeShifts(user.role, user.departmentId),
  ]);
  const calendarVisible = isManager(user.role) || visibility === "ALL_EMPLOYEES";

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={calendarVisible} shiftsVisible={shiftsVisible} />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Min profil</h1>
        <ProfileClient
          initialName={user.name ?? ""}
          initialEmail={user.email ?? ""}
          role={user.role}
        />
      </main>
    </div>
  );
}
