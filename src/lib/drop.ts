// The Daily Drop: new pieces are released at a fixed time each day (8:30 AM IST),
// shown in a special homepage section for 24 hours, and then flow into New
// Arrivals on their own. Everything about that timing lives here so the admin
// form, the storefront queries and the countdown all agree.
//
// Safe to import anywhere: no database or server-only code in here.

/** India has no daylight saving, so a fixed offset is exact. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DROP_HOUR = 8;
export const DROP_MINUTE = 30;
export const DROP_TIME_LABEL = "8:30 AM";
/** How long a dropped piece stays in the Daily Drop section. */
export const DROP_VISIBLE_MS = DAY_MS;
/** Furthest ahead a release can be scheduled. */
export const MAX_SCHEDULE_DAYS = 60;

/** The next daily drop time strictly after `from`. */
export function nextDropTime(from: Date = new Date()): Date {
  const ist = new Date(from.getTime() + IST_OFFSET_MS);
  const slotToday = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), DROP_HOUR, DROP_MINUTE) - IST_OFFSET_MS;
  return new Date(slotToday > from.getTime() ? slotToday : slotToday + DAY_MS);
}

/** Start of the window in which a released piece still counts as "today's drop". */
export function dropWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - DROP_VISIBLE_MS);
}

export function isLive(releaseAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  return !releaseAt || new Date(releaseAt).getTime() <= now.getTime();
}

/** Where a product is in its life: not yet out, in the Daily Drop, or a regular listing. */
export type DropStatus = "scheduled" | "in-drop" | "live";

export function dropStatus(
  product: { releaseAt: Date | string | null; isDrop: boolean },
  now: Date = new Date()
): DropStatus {
  if (!isLive(product.releaseAt, now)) return "scheduled";
  if (product.isDrop && product.releaseAt && new Date(product.releaseAt).getTime() > now.getTime() - DROP_VISIBLE_MS) {
    return "in-drop";
  }
  return "live";
}

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const timeOnly = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" });

/** "Thursday" in Indian time. */
export function formatDropWeekday(date: Date | string): string {
  return weekday.format(new Date(date));
}

/** "17 Oct, 8:30 am" in Indian time, whatever the viewer's own time zone. */
export function formatDropDateTime(date: Date | string): string {
  return dateTime.format(new Date(date));
}

export function formatDropTime(date: Date | string): string {
  return timeOnly.format(new Date(date)).toUpperCase();
}

/** Value for a `datetime-local` input, expressed in Indian time. */
export function toISTInputValue(date: Date | string): string {
  const ist = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 16);
}

/** Reads a `datetime-local` value as Indian time. Returns null if it is not a valid date. */
export function fromISTInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi) - IST_OFFSET_MS);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type ReleaseMode = "keep" | "next-drop" | "now" | "custom";

/**
 * Turns the admin's choice into the release time to store.
 * Returns `undefined` for "keep" (leave the stored value alone) and an error
 * message when a custom time is missing, invalid or too far away.
 */
export function resolveRelease(
  mode: ReleaseMode,
  customAt: string | null | undefined,
  now: Date = new Date()
): { releaseAt: Date | undefined } | { error: string } {
  switch (mode) {
    case "keep":
      return { releaseAt: undefined };
    case "now":
      return { releaseAt: now };
    case "next-drop":
      return { releaseAt: nextDropTime(now) };
    case "custom": {
      const at = customAt ? new Date(customAt) : null;
      if (!at || Number.isNaN(at.getTime())) return { error: "Choose a valid release date and time" };
      if (at.getTime() > now.getTime() + MAX_SCHEDULE_DAYS * DAY_MS) {
        return { error: `Release time can be at most ${MAX_SCHEDULE_DAYS} days ahead` };
      }
      return { releaseAt: at };
    }
  }
}
