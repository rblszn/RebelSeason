/**
 * India Standard Time helpers (UTC+05:30, no daylight saving). The shop's "day", reports and
 * the financial year on bill numbers all follow IST, whatever timezone the server runs in.
 */
const IST_OFFSET_MS = 330 * 60_000;

/** "YYYY-MM-DD" for `date` in IST. */
export function istDate(date: Date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isIsoDate(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
}

/** UTC instants for the start of `from` and the end of `to` (inclusive IST days). */
export function istRange(from: string, to: string = from) {
  const start = new Date(Date.parse(`${from}T00:00:00Z`) - IST_OFFSET_MS);
  const end = new Date(Date.parse(`${to}T00:00:00Z`) - IST_OFFSET_MS + 24 * 60 * 60_000);
  return { start, end };
}

/** Indian financial year (April-March) as "26-27" for a date in IST. */
export function financialYear(date: Date = new Date()) {
  const [y, m] = istDate(date).split("-").map(Number);
  const startYear = m >= 4 ? y : y - 1;
  return `${String(startYear % 100).padStart(2, "0")}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** Add whole days to a "YYYY-MM-DD" date. */
export function addDays(day: string, days: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 24 * 60 * 60_000).toISOString().slice(0, 10);
}
