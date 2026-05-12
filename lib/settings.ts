import { prisma } from "@/lib/prisma";

export async function getCalendarVisibility(): Promise<"ALL_EMPLOYEES" | "MANAGEMENT_ONLY"> {
  const settings = await prisma.appSettings.findFirst();
  return settings?.calendarVisibility ?? "ALL_EMPLOYEES";
}
