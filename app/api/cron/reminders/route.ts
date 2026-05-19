import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// Called daily by Vercel Cron (see vercel.json)
// Schedule: every day at 08:00 UTC

export async function GET(request: Request) {
  // Protect: CRON_SECRET is required — endpoint is blocked if not configured
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.appSettings.findFirst();
  const thresholdDays = settings?.reminderThresholdDays ?? 3;

  // 0 = disabled
  if (thresholdDays === 0) {
    return NextResponse.json({ skipped: true, reason: "Reminders disabled (threshold = 0)" });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);

  // Find all PENDING requests older than threshold
  const pendingRequests = await prisma.vacationRequest.findMany({
    where: {
      status: "PENDING",
      createdAt: { lte: cutoff },
    },
    include: {
      user: { select: { id: true, name: true } },
      department: {
        include: {
          users: {
            where: { role: { in: ["MANAGER", "ADMIN"] } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (pendingRequests.length === 0) {
    return NextResponse.json({ sent: 0, checked: 0, thresholdDays });
  }

  let sent = 0;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const req of pendingRequests) {
    const managerIds = req.department.users.map((u: { id: string }) => u.id);
    if (managerIds.length === 0) continue;

    // Don't re-notify within 24h for same request
    const recentReminders = await prisma.notification.findMany({
      where: {
        userId: { in: managerIds },
        type: "PENDING_REMINDER",
        createdAt: { gte: dayAgo },
        message: { contains: req.id },
      },
      select: { userId: true },
    });

    const alreadyNotified = new Set(recentReminders.map((n: { userId: string }) => n.userId));
    const daysWaiting = Math.floor(
      (Date.now() - new Date(req.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    for (const managerId of managerIds) {
      if (alreadyNotified.has(managerId)) continue;

      await createNotification({
        userId: managerId,
        type: "PENDING_REMINDER",
        title: "⏰ Ansøgning afventer svar",
        message: `${req.user!.name}s ansøgning har ventet i ${daysWaiting} dag${daysWaiting !== 1 ? "e" : ""} — id: ${req.id}`,
        link: `/manager/requests`,
      });
      sent++;
    }
  }

  return NextResponse.json({ sent, checked: pendingRequests.length, thresholdDays });
}
