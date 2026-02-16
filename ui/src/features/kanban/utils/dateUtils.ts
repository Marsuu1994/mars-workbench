/**
 * Returns today's date at midnight (local time), with time components zeroed out.
 */
export function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Returns true if `a` and `b` share the same year/month/day.
 * Returns false if `a` is null.
 */
export function sameDay(a: Date | null, b: Date): boolean {
  if (!a) return false;
  const az = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bz = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return az.getTime() === bz.getTime();
}

/**
 * Parses a periodKey like "2026-W06" and returns the Monday of that ISO week.
 */
export function getMondayFromPeriodKey(periodKey: string): Date {
  const [yearStr, weekStr] = periodKey.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);

  // ISO week 1 contains the year's first Thursday.
  // Compute Monday of the given ISO week.
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Mon=1 … Sun=7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);
  return monday;
}

/**
 * Parses a periodKey like "2026-W06" and returns a formatted string
 * like "Week 06 · Feb 3 – Feb 9" (Monday–Sunday range).
 */
export function getWeekDateRange(periodKey: string): string {
  const weekStr = periodKey.split("-W")[1];
  const monday = getMondayFromPeriodKey(periodKey);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const monStr = fmt.format(monday);
  const sunStr = fmt.format(sunday);

  return `Week ${weekStr} · ${monStr} – ${sunStr}`;
}

/**
 * Returns the ISO week key for a given date, e.g. "2026-W07".
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}