import { NextResponse } from "next/server";
export async function GET() {
  const url = process.env.DATABASE_URL ?? "not found";
  const match = url.match(/postgresql:\/\/([^:]+):[^@]+@([^/]+)\/([^?]+)/);
  if (!match) return NextResponse.json({ raw: url.substring(0, 80) });
  return NextResponse.json({ user: match[1], host: match[2], db: match[3] });
}
