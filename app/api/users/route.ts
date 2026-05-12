import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, role, departmentId } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Navn, email og adgangskode er påkrævet" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email allerede i brug" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role || "EMPLOYEE",
      departmentId: departmentId || null,
    },
  });

  return NextResponse.json({ id: newUser.id }, { status: 201 });
}
