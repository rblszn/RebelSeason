import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Whole rupees in Indian format, e.g. ₹1,499. */
export function formatPrice(price: number | string): string {
  const value = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const dateTimeIST = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
const timeIST = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });

/** "17 Oct 2026, 8:30 am" in Indian time, whatever time zone the server or browser is in. */
export function formatDateTime(value: Date | string): string {
  return dateTimeIST.format(new Date(value));
}

const dateIST = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

/** "17 Oct 2026" in Indian time. */
export function formatDate(value: Date | string): string {
  return dateIST.format(new Date(value));
}

/** "8:30 am" in Indian time. */
export function formatTime(value: Date | string): string {
  return timeIST.format(new Date(value));
}
