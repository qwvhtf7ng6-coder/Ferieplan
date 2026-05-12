import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { RequestForm } from "@/components/RequestForm";
import type { SessionUser } from "@/types";

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  if (!user.departmentId) {
    return (
      <div>
        <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
            <p className="text-orange-800 font-medium">
              Du er ikke tilknyttet en afdeling.
            </p>
            <p className="text-orange-600 text-sm mt-1">
              Kontakt en administrator for at blive tilknyttet en afdeling.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ny ferieansøgning</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ansøgningen sendes til godkendelse hos din leder.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <RequestForm />
        </div>
      </main>
    </div>
  );
}
