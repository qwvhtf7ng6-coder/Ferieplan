import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// Helligdage vi eksluderer (store bededag + mærkedage)
const EXCLUDED = [
  "Store Bededag",
  "General Prayer Day",
  "Valentine's Day",
  "Mother's Day",
  "Father's Day",
];

// Nager.Date API typer
interface NagerHoliday {
  date: string;        // "2025-04-18"
  localName: string;   // "Langfredag"
  name: string;        // "Good Friday"
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];     // ["Public"]
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { year } = await req.json();
  if (!year || isNaN(parseInt(year))) {
    return NextResponse.json({ error: "Ugyldigt år" }, { status: 400 });
  }

  // Hent fra Nager.Date
  const res = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/DK`,
    { headers: { Accept: "application/json" }, next: { revalidate: 86400 } }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `Kunne ikke hente helligdage (${res.status})` },
      { status: 502 }
    );
  }

  const holidays: NagerHoliday[] = await res.json();

  // Filtrer: kun Public + global, ingen ekskluderede
  const filtered = holidays.filter((h) => {
    if (!h.types.includes("Public")) return false;
    if (!h.global) return false;
    if (EXCLUDED.some((ex) => h.localName.includes(ex) || h.name.includes(ex))) return false;
    return true;
  });

  // Upsert ind i databasen
  let inserted = 0;
  let skipped = 0;

  for (const h of filtered) {
    const id = `nager-${h.date}`;
    const existing = await prisma.holiday.findUnique({ where: { id } });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.holiday.create({
      data: {
        id,
        name: h.localName,
        date: new Date(h.date),
        isNational: true,
      },
    });
    inserted++;
  }

  return NextResponse.json({
    ok: true,
    year: parseInt(year),
    inserted,
    skipped,
    total: filtered.length,
  });
}
