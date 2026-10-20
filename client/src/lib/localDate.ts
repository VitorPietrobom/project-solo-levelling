// Calendar-date helpers that use the viewer's local day, never UTC.
// `toISOString()` converts to UTC first, so in the evening west of UTC it
// returns tomorrow's date — don't use it for "today".

/** YYYY-MM-DD of the given moment in the local timezone. */
export function localISODate(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Monday (YYYY-MM-DD) of the week containing the given YYYY-MM-DD date,
 *  computed on plain date parts so it never shifts with the timezone. */
export function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  const day = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return dt.toISOString().slice(0, 10);
}

/** Monday of the current local week. */
export function currentMonday(now: Date = new Date()): string {
  return mondayOf(localISODate(now));
}
