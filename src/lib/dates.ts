/**
 * Dates as people in the office read them.
 *
 * Everything here works in Kathmandu time. Cutting a date out of
 * `toISOString()` gives the UTC day, which in Nepal is still yesterday until
 * 05:45, and it turns the first of the month into the last day of the one
 * before. The server may run anywhere, so the zone is named, not assumed.
 */

const ZONE = "Asia/Kathmandu";

/** YYYY-MM-DD for a moment, in Kathmandu. */
export function localDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

/** The first of this month, in Kathmandu. */
export const monthStartDay = (d: Date = new Date()) => `${localDay(d).slice(0, 8)}01`;

/** The day `n` days after a YYYY-MM-DD day. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10); // built in UTC, so this slice is exact
}

/** Whole days from today to a YYYY-MM-DD day. Negative is in the past. */
export function daysFromToday(day: string): number {
  const [y1, m1, d1] = localDay().split("-").map(Number);
  const [y2, m2, d2] = day.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}

/** "17 Sep", or "17 Sep 2025" when it is not this year. */
export function shortDate(day: string | null | undefined): string {
  if (!day) return "";
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return day;
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  return y === Number(localDay().slice(0, 4)) ? `${d} ${month}` : `${d} ${month} ${y}`;
}

/** "Today", "Tomorrow", "In 3 days", "2 days late". For deadlines. */
export function dueText(day: string | null | undefined): string {
  if (!day) return "No date";
  const n = daysFromToday(day);
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n === -1) return "1 day late";
  if (n < 0) return `${-n} days late`;
  if (n < 7) return `Due in ${n} days`;
  return `Due ${shortDate(day)}`;
}

/** "Today", "Yesterday", or a short date. For things that already happened. */
export function whenText(day: string | null | undefined): string {
  if (!day) return "";
  const n = daysFromToday(day);
  if (n === 0) return "Today";
  if (n === -1) return "Yesterday";
  return shortDate(day);
}
