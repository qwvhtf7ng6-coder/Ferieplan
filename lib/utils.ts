import {
  format,
  eachDayOfInterval,
  isWeekend,
  startOfMonth,
  endOfMonth,
  parseISO,
  isValid,
} from "date-fns";
import { da } from "date-fns/locale";

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "d. MMM yyyy", { locale: da });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "d/M", { locale: da });
}

export function formatMonthYear(year: number, month: number): string {
  return format(new Date(year, month - 1), "MMMM yyyy", { locale: da });
}

export function getWorkingDays(start: Date, end: Date, holidays: Date[]): Date[] {
  const days = eachDayOfInterval({ start, end });
  const holidayStrings = new Set(holidays.map((h) => format(h, "yyyy-MM-dd")));
  return days.filter(
    (d) => !isWeekend(d) && !holidayStrings.has(format(d, "yyyy-MM-dd"))
  );
}

export function getMonthDays(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  return eachDayOfInterval({ start, end });
}

export function toDateKey(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM-dd");
}

export function entryTypeToDays(type: string): number {
  return type === "FULL_DAY" ? 1 : 0.5;
}

export function totalDaysFromEntries(entries: { days: number }[]): number {
  return entries.reduce((sum, e) => sum + e.days, 0);
}

export function cn(...classes: (string | undefined | false | null)[]): string {
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
  HALF_DAY_AM: "Halvdag (formiddag)",
  HALF_DAY_PM: "Halvdag (eftermiddag)",
};

export const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Medarbejder",
  MANAGER: "Leder",
  ADMIN: "Admin",
};
