import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// Called daily by Vercel Cron (see vercel.json)
// Schedule: every day at 08:00 UTC

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Hent threshold per org — brug settings.reminderThresholdDays
  // Cron looper alle aktive orgs
  const orgs = await prisma.organization.findMany({
    where: { status: "ACTIVE" },
    include: { settings: true },
  });

  let totalSent = 0;
  let totalChecked = 0;

  for (const org of orgs) {
    const thresholdDays = org.settings?.reminderThresholdDays ?? 3;
    if (thresholdDays === 0) continue;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - thresholdDays);

    const pendingRequests = await prisma.vacationRequest.findMany({
      where: {
        organizationId: org.id,
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

    totalChecked += pendingRequests.length;
    if (pendingRequests.length === 0) continue;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const req of pendingRequests) {
      const managerIds = req.department.users.map((u: { id: string }) => u.id);
      if (managerIds.length === 0) continue;

      const recentReminders = await prisma.notification.findMany({
        where: {
          organizationId: org.id,
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
          organizationId: org.id,
          userId: managerId,
          type: "PENDING_REMINDER",
          title: "⏰ Ansøgning afventer svar",
          message: `${req.user!.name}s ansøgning har ventet i ${daysWaiting} dag${daysWaiting !== 1 ? "e" : ""} — id: ${req.id}`,
          link: `/manager/requests`,
        });
        totalSent++;
      }
    }
  }

  return NextResponse.json({ sent: totalSent, checked: totalChecked, orgs: orgs.length });
}
