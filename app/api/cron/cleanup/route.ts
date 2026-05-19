import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Kaldt dagligt af Vercel Cron (se vercel.json)
// Schedule: hver nat kl. 02:00 UTC
//
// Hvad der ryddes op:
//  1. Notifikationer ældre end 90 dage (allerede læste) eller 180 dage (uanset)
//  2. AuditLogs ældre end 365 dage
//  3. ShiftAssignments mere end 6 måneder tilbage i tid
//  4. Læste notifikationer ældre end 30 dage

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Grænseværdier
  const notificationReadCutoff = new Date(now);
  notificationReadCutoff.setDate(notificationReadCutoff.getDate() - 30); // læste: 30 dage

  const notificationAllCutoff = new Date(now);
  notificationAllCutoff.setDate(notificationAllCutoff.getDate() - 180); // alle: 180 dage

  const auditLogCutoff = new Date(now);
  auditLogCutoff.setFullYear(auditLogCutoff.getFullYear() - 1); // 365 dage

  const shiftAssignmentCutoff = new Date(now);
  shiftAssignmentCutoff.setMonth(shiftAssignmentCutoff.getMonth() - 6); // 6 måneder

  const [deletedReadNotifs, deletedOldNotifs, deletedAuditLogs, deletedShifts] =
    await Promise.all([
      // Slet læste notifikationer ældre end 30 dage
      prisma.notification.deleteMany({
        where: {
          readAt: { not: null, lte: notificationReadCutoff },
        },
      }),
      // Slet alle notifikationer ældre end 180 dage (uanset læst-status)
      prisma.notification.deleteMany({
        where: {
          createdAt: { lte: notificationAllCutoff },
        },
      }),
      // Slet auditlogs ældre end 365 dage
      // Bevar logs tilknyttet aktive ansøgninger (requestId = null eller request findes)
      prisma.auditLog.deleteMany({
        where: {
          createdAt: { lte: auditLogCutoff },
          requestId: null, // kun orphaned logs — request-tilknyttede bevares
        },
      }),
      // Slet ShiftAssignments ældre end 6 måneder
      prisma.shiftAssignment.deleteMany({
        where: {
          date: { lte: shiftAssignmentCutoff },
        },
      }),
    ]);

  const summary = {
    deletedReadNotifications: deletedReadNotifs.count,
    deletedOldNotifications: deletedOldNotifs.count,
    deletedOrphanedAuditLogs: deletedAuditLogs.count,
    deletedOldShiftAssignments: deletedShifts.count,
    runAt: now.toISOString(),
  };

  console.log("[cron/cleanup]", summary);

  return NextResponse.json(summary);
}
