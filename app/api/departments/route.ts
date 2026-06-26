import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  const departments = await prisma.department.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(departments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  if (!can(buildSubject(user), "departments.edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, maxConcurrent, shiftsEnabled } = await req.json();
  if (!name) return NextResponse.json({ error: "Navn påkrævet" }, { status: 400 });

  const dept = await prisma.department.create({
    data: { organizationId: orgId, name, maxConcurrent: maxConcurrent ?? 2, shiftsEnabled: shiftsEnabled !== false },
  });
  return NextResponse.json(dept, { status: 201 });
}
