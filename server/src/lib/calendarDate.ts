const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a strict `YYYY-MM-DD` calendar date into a UTC-midnight Date, which
 * is what `@db.Date` columns store. Returns null for anything else (full ISO
 * timestamps, garbage, impossible dates like 2024-02-30) so callers can 400
 * instead of letting Prisma throw a 500 or silently shifting the day.
 */
export function parseCalendarDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !CALENDAR_DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}
