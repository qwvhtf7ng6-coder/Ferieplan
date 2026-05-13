"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function getMyNotifications(): Promise<{
  ok: boolean;
  data?: NotificationRow[];
  unreadCount?: number;
  error?: string;
}> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Ikke logget ind" };

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return { ok: true, data: notifications, unreadCount };
}

export async function getUnreadCount(): Promise<{ ok: boolean; count?: number }> {
  const user = await getSession();
  if (!user) return { ok: false };

  const count = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return { ok: true, count };
}

export async function markNotificationRead(notificationId: string): Promise<{ ok: boolean }> {
  const user = await getSession();
  if (!user) return { ok: false };

  // Ensure ownership before updating
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: user.id },
  });
  if (!notification) return { ok: false };

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });

  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const user = await getSession();
  if (!user) return { ok: false };

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return { ok: true };
}
