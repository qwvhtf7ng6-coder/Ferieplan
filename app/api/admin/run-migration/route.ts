import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// ⚠️ MIDLERTIDIG ENGANGS-ROUTE — slettes efter migrationen er kørt.
// Beskyttet med MIGRATION_SECRET miljøvariabel. Kør ÉN gang, slet så filen.

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sqlPath = path.join(process.cwd(), "prisma", "migrations", "migrate_to_multitenant.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  // Fjern BEGIN/COMMIT — vi styrer transaktionen selv via Prisma
  const cleaned = sql
    .split("\n")
    .filter((line) => line.trim() !== "BEGIN;" && line.trim() !== "COMMIT;")
    .join("\n");

  // Split i statements. Håndterer DO $$ ... $$ blocks som ét statement.
  const statements: string[] = [];
  let current = "";
  let inDollarBlock = false;

  for (const line of cleaned.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") || trimmed === "") continue;

    current += line + "\n";

    if (trimmed.includes("$$")) {
      const dollarCount = (trimmed.match(/\$\$/g) || []).length;
      if (dollarCount % 2 === 1) inDollarBlock = !inDollarBlock;
    }

    if (!inDollarBlock && trimmed.endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());

  const client = new PrismaClient();
  const results: { statement: string; ok: boolean; error?: string }[] = [];

  try {
    await client.$transaction(async (tx) => {
      for (const stmt of statements) {
        try {
          await tx.$executeRawUnsafe(stmt);
          results.push({ statement: stmt.slice(0, 80), ok: true });
        } catch (e: any) {
          results.push({ statement: stmt.slice(0, 80), ok: false, error: e.message });
          throw e; // rul hele transaktionen tilbage ved første fejl
        }
      }
    });
  } catch (e: any) {
    await client.$disconnect();
    return NextResponse.json(
      { ok: false, error: "Migration fejlede — alt rullet tilbage", results },
      { status: 500 }
    );
  }

  await client.$disconnect();
  return NextResponse.json({ ok: true, statementsRun: results.length, results });
}
