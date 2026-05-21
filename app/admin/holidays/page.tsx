import { redirect } from "next/navigation";

/**
 * /admin/holidays er udfaset i Fase 4b — funktionaliteten bor nu som tab
 * under /admin/settings. Redirect så bookmarks bevares.
 */
export default function HolidaysPage() {
  redirect("/admin/settings?tab=holidays");
}
