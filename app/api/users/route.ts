import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import { isValidRole } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const subject = buildSubject(user);
  if (!can(subject, "user.create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, role, departmentId } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Navn, email og adgangskode er påkrævet" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ugyldig email-adresse" }, { status: 400 });
  }
  if (typeof password === "string" && password.length < 8) {
    return NextResponse.json({ error: "Adgangskode skal være mindst 8 tegn" }, { status: 400 });
  }

  const safeRole = isValidRole(role) ? role : "EMPLOYEE";

  // Normalisér email til lowercase før både lookup og storage
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return NextResponse.json({ error: "Email allerede i brug" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role: safeRole,
      departmentId: departmentId || null,
    },
  });

  return NextResponse.json({ id: newUser.id }, { status: 201 });
}
