import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  if (!can(buildSubject(user), "holidays.edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const holiday = await prisma.holiday.findFirst({ where: { id, organizationId: orgId } });
  if (!holiday) return NextResponse.json({ error: "Helligdag ikke fundet" }, { status: 404 });

  await prisma.holiday.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
