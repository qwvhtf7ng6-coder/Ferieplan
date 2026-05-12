import {
  format,
  eachDayOfInterval,
  isWeekend,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
} from "date-fns";
import { da } from "date-fns/locale";

export function formatDate(date: Date | string) {
  return format(new Date(date), "d. MMM yyyy", { locale: da });
}

export function formatDateShort(date: Date | string) {
  return format(new Date(date), "d/M", { locale: da });
}

export function getWorkingDays(start: Date, end: Date, holidays: Date[]) {
  const days = eachDayOfInterval({ start, end });
  const holidayStrings = new Set(holidays.map((h) => format(h, "yyyy-MM-dd")));
  return days.filter(
    (d) => !isWeekend(d) && !holidayStrings.has(format(d, "yyyy-MM-dd"))
  );
}

export function getMonthDays(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  return eachDayOfInterval({ start, end });
}

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Afventer",
  APPROVED: "Godkendt",
  REJECTED: "Afvist",
  CANCELLED: "Annulleret",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  FULL_DAY: "Hel dag",
  HALF_DAY_AM: "Halv dag (formiddag)",
  HALF_DAY_PM: "Halv dag (eftermiddag)",
};
