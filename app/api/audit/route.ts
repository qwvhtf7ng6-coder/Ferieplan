import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManager } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where = requestId ? { requestId } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
}
