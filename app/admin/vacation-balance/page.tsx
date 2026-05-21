import { redirect } from "next/navigation";

/**
 * /admin/vacation-balance er udfaset i Fase 4b — funktionaliteten bor nu
 * som tab under /admin/settings. Vi viderefører evt. ?year=…-param.
 */
export default async function VacationBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "balance" });
  if (sp.year) params.set("year", sp.year);
  redirect(`/admin/settings?${params.toString()}`);
}
