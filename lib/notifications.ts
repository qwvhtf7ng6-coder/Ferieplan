import { prisma } from "@/lib/prisma";

type NotificationType =
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "REQUEST_CANCELLED"
  | "REQUEST_EDITED"
  | "NEW_REQUEST_SUBMITTED"
  | "PENDING_REMINDER";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  await prisma.notification.create({ data: input });
}

/** Notify the employee who owns the request of a status decision */
export async function notifyEmployeeOfDecision(
  requestId: string,
  employeeId: string,
  type: "REQUEST_APPROVED" | "REQUEST_REJECTED" | "REQUEST_CANCELLED" | "REQUEST_EDITED",
  actorName: string
) {
  const titles: Record<typeof type, string> = {
    REQUEST_APPROVED:  "Ansøgning godkendt",
    REQUEST_REJECTED:  "Ansøgning afvist",
    REQUEST_CANCELLED: "Ansøgning annulleret",
    REQUEST_EDITED:    "Ansøgning ændret",
  };
  const messages: Record<typeof type, string> = {
    REQUEST_APPROVED:  `Din ansøgning er blevet godkendt af ${actorName}.`,
    REQUEST_REJECTED:  `Din ansøgning er blevet afvist af ${actorName}.`,
    REQUEST_CANCELLED: `Din ansøgning er blevet annulleret af ${actorName}.`,
    REQUEST_EDITED:    `Din ansøgnings note er blevet redigeret af ${actorName}.`,
  };

  await createNotification({
    userId: employeeId,
    type,
    title: titles[type],
    message: messages[type],
    link: `/requests/${requestId}`,
  });
}

/** Notify all managers in the same department of a new request */
export async function notifyManagersOfNewRequest(
  requestId: string,
  departmentId: string,
  employeeName: string
) {
  const managers = await prisma.user.findMany({
    where: {
      departmentId,
      role: { in: ["MANAGER", "ADMIN"] },
    },
    select: { id: true },
  });

  await Promise.all(
    managers.map((m) =>
      createNotification({
        userId: m.id,
        type: "NEW_REQUEST_SUBMITTED",
        title: "Ny ansøgning",
        message: `${employeeName} har indsendt en ny ansøgning.`,
        link: `/manager/requests`,
      })
    )
  );
}

/** Notify all admins of a new request (only those not already notified as manager) */
export async function notifyAdminsOfNewRequest(
  requestId: string,
  departmentId: string,
  employeeName: string,
  alreadyNotifiedUserIds: string[]
) {
  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      id: { notIn: alreadyNotifiedUserIds },
    },
    select: { id: true },
  });

  await Promise.all(
    admins.map((a) =>
      createNotification({
        userId: a.id,
        type: "NEW_REQUEST_SUBMITTED",
        title: "Ny ansøgning",
        message: `${employeeName} har indsendt en ny ansøgning.`,
        link: `/manager/requests`,
      })
    )
  );
}
