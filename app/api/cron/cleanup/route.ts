import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Kaldt dagligt af Vercel Cron (se vercel.json)
// Schedule: hver nat kl. 02:00 UTC
//
// Hvad der ryddes op:
//  1. Læste notifikationer ældre end 30 dage
//  2. Alle notifikationer ældre end 180 dage (uanset læst-status)
//  3. AuditLogs ældre end 365 dage HVOR den tilknyttede ansøgning enten:
//     - er i terminal status (APPROVED/REJECTED/CANCELLED), eller
//     - allerede er slettet (requestId = null efter onDelete: SetNull)
//     PENDING-ansøgningers logs bevares (de skal kunne ses i tidslinjen).
//  4. ShiftAssignments mere end 12 måneder tilbage i tid
//     (12 mdr så manager-kalenderens "forrige måned"-navigation stadig viser
//      historiske vagter i mindst et år tilbage)

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Grænseværdier
  const notificationReadCutoff = new Date(now);
  notificationReadCutoff.setDate(notificationReadCutoff.getDate() - 30);

  const notificationAllCutoff = new Date(now);
  notificationAllCutoff.setDate(notificationAllCutoff.getDate() - 180);

  const auditLogCutoff = new Date(now);
  auditLogCutoff.setFullYear(auditLogCutoff.getFullYear() - 1);

  const shiftAssignmentCutoff = new Date(now);
  shiftAssignmentCutoff.setMonth(shiftAssignmentCutoff.getMonth() - 12);

  const [
    deletedReadNotifs,
    deletedOldNotifs,
    deletedAuditLogs,
    deletedShifts,
  ] = await Promise.all([
    // 1. Slet læste notifikationer ældre end 30 dage
    prisma.notification.deleteMany({
      where: {
        readAt: { not: null, lte: notificationReadCutoff },
      },
    }),
    // 2. Slet alle notifikationer ældre end 180 dage
    prisma.notification.deleteMany({
      where: {
        createdAt: { lte: notificationAllCutoff },
      },
    }),
    // 3. Slet auditlogs >365 dage hvor request er afsluttet eller slettet
    prisma.auditLog.deleteMany({
      where: {
        createdAt: { lte: auditLogCutoff },
        OR: [
          { requestId: null }, // request er slettet (onDelete: SetNull)
          {
            request: {
              status: { in: ["APPROVED", "REJECTED", "CANCELLED"] },
            },
          },
        ],
      },
    }),
    // 4. Slet ShiftAssignments ældre end 12 måneder
    prisma.shiftAssignment.deleteMany({
      where: {
        date: { lte: shiftAssignmentCutoff },
      },
    }),
  ]);

  const summary = {
    deletedReadNotifications: deletedReadNotifs.count,
    deletedOldNotifications: deletedOldNotifs.count,
    deletedAuditLogs: deletedAuditLogs.count,
    deletedOldShiftAssignments: deletedShifts.count,
    runAt: now.toISOString(),
  };

  console.log("[cron/cleanup]", summary);

  return NextResponse.json(summary);
}
