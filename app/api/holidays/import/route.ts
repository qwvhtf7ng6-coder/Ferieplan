import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import { NextRequest, NextResponse } from "next/server";

const EXCLUDED = [
  "Store Bededag",
  "General Prayer Day",
  "Valentine's Day",
  "Mother's Day",
  "Father's Day",
];

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  if (!can(buildSubject(user), "holidays.edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { year } = await req.json();
  const parsedYear = parseInt(year, 10);
  if (!parsedYear || isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    return NextResponse.json({ error: "Ugyldigt år — skal være mellem 2000 og 2100" }, { status: 400 });
  }

  const res = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${parsedYear}/DK`,
    { headers: { Accept: "application/json" }, next: { revalidate: 86400 } }
  );
  if (!res.ok) {
    return NextResponse.json({ error: `Kunne ikke hente helligdage (${res.status})` }, { status: 502 });
  }

  const holidays: NagerHoliday[] = await res.json();
  const filtered = holidays.filter((h) => {
    if (!h.types.includes("Public")) return false;
    if (!h.global) return false;
    if (EXCLUDED.some((ex) => h.localName.includes(ex) || h.name.includes(ex))) return false;
    return true;
  });

  let inserted = 0;
  let skipped = 0;

  for (const h of filtered) {
    // Org-specifik id for at undgå kollision på tværs af orgs
    const id = `nager-${orgId}-${h.date}`;
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (existing) { skipped++; continue; }

    await prisma.holiday.create({
      data: { id, organizationId: orgId, name: h.localName, date: new Date(h.date), isNational: true },
    });
    inserted++;
  }

  return NextResponse.json({ ok: true, year: parsedYear, inserted, skipped, total: filtered.length });
}
