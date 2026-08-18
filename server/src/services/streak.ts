const MS_PER_DAY = 86400000;

function toDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function subtractDays(dateStr: string, n: number): string {
  const d = toDate(dateStr);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Counts the current day streak from a set of "active" dates (YYYY-MM-DD,
 * any order, duplicates fine) and today's date.
 *
 * A streak that ended yesterday still counts as N, not 0 — otherwise every
 * user's streak would read 0 first thing in the morning before they've
 * logged anything today, which reads as "you lost your streak" when you
 * haven't. It only actually breaks once a full day is skipped.
 */
export function computeStreak(activeDates: string[], today: string): number {
  const active = new Set(activeDates);
  if (active.size === 0) return 0;

  // Anchor on today if there's activity today, otherwise on yesterday —
  // either way we then walk backwards counting the unbroken run.
  let cursor = active.has(today) ? today : subtractDays(today, 1);
  if (!active.has(cursor)) return 0;

  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor = subtractDays(cursor, 1);
  }
  return streak;
}

export { subtractDays, MS_PER_DAY };
