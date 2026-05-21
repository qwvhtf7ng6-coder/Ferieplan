import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProfileClient } from "./ProfileClient";
import { PageHeader } from "@/components/ui/PageHeader";
import type { SessionUser } from "@/types";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  return (
    <AppShell>
      <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <PageHeader title="Min profil" subtitle="Administrer dine personlige oplysninger" />
        <ProfileClient
          initialName={user.name ?? ""}
          initialEmail={user.email ?? ""}
          role={user.role}
        />
      </main>
    </AppShell>
  );
}
