import { redirect } from "next/navigation";

/**
 * Den selvstændige /admin/departments-side er udfaset i Fase 4b — funktionaliteten
 * bor nu som tab under /admin/settings. Vi redirecter så bookmarks og gamle
 * links (fx fra emails) ikke knækker.
 */
export default function DepartmentsPage() {
  redirect("/admin/settings?tab=departments");
}
