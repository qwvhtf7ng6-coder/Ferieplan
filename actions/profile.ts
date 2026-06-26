"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types";
import type { SessionUser } from "@/types";

async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function updateProfile(input: {
  name: string;
  email: string;
}): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };
  const orgId = (user as any).organizationId as string | null;

  const { name, email } = input;
  if (!name?.trim()) return { ok: false, error: "Navn er påkrævet" };
  if (!email?.trim()) return { ok: false, error: "Email er påkrævet" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Ugyldig email-adresse" };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Email-uniqueness inden for org (ekskluder sig selv)
  const existing = await prisma.user.findFirst({
    where: { email: normalizedEmail, organizationId: orgId, NOT: { id: user.id } },
  });
  if (existing) return { ok: false, error: "Email er allerede i brug" };

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name.trim(), email: normalizedEmail },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updatePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };

  const { currentPassword, newPassword, confirmPassword } = input;
  if (!currentPassword) return { ok: false, error: "Indtast nuværende adgangskode" };
  if (!newPassword) return { ok: false, error: "Indtast ny adgangskode" };
  if (newPassword.length < 8) return { ok: false, error: "Adgangskode skal være mindst 8 tegn" };
  if (newPassword !== confirmPassword) return { ok: false, error: "Adgangskoderne stemmer ikke overens" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { ok: false, error: "Bruger ikke fundet" };

  const valid = await bcrypt.compare(currentPassword, dbUser.password);
  if (!valid) return { ok: false, error: "Nuværende adgangskode er forkert" };

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  return { ok: true };
}
