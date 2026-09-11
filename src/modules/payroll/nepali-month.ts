import NepaliDate from "nepali-date-converter";

/**
 * Nepali months, because that is when salary is paid in Nepal.
 *
 * A Nepali month does not line up with a Gregorian one. Ashar 2083 ran from
 * 15 June to 14 July 2026. A payroll keyed to "July" would therefore be a
 * payroll for no month anybody recognises, and the attendance beside each
 * person would be the wrong three weeks.
 *
 * So a run carries which calendar it belongs to. A Nepali run is stored as the
 * Nepali year and month, "2083-03" for Ashar 2083, and the Gregorian dates are
 * worked out from it whenever real dates are needed, which is mostly the
 * attendance snapshot.
 *
 * The conversion is a library rather than a table written out here. Nepali
 * month lengths vary year to year and are published rather than calculated, so
 * a hand-copied table is ninety years of numbers with no way to notice a typo
 * until somebody's pay covers the wrong fortnight.
 */

export const NEPALI_MONTHS = [
  "Baisakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashoj",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
] as const;

export type Calendar = "bs" | "ad";

/** "2083-03" into its parts. Null for anything that is not one. */
export function parseMonth(month: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

/**
 * A date as YYYY-MM-DD in the calendar the machine is standing in.
 *
 * Deliberately not toISOString(). The converter hands back midnight local
 * time, and toISOString() turns that into UTC, which is the previous evening
 * anywhere east of Greenwich and therefore the previous DAY. That puts every
 * Nepali month boundary one day early, which looks like nothing and moves a
 * person's pay into the wrong month.
 */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "Ashar 2083", or the month itself if it cannot be read. */
export function monthLabel(month: string, calendar: Calendar): string {
  const p = parseMonth(month);
  if (!p) return month;
  if (calendar === "ad") {
    return new Date(p.year, p.month - 1, 1)
      .toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }
  return `${NEPALI_MONTHS[p.month - 1]} ${p.year}`;
}

/** The Gregorian first and last day of a month in either calendar. */
export function monthRange(month: string, calendar: Calendar): { from: string; to: string } | null {
  const p = parseMonth(month);
  if (!p) return null;

  if (calendar === "ad") {
    const from = new Date(p.year, p.month - 1, 1);
    const to = new Date(p.year, p.month, 0);
    return { from: iso(from), to: iso(to) };
  }

  const first = new NepaliDate(p.year, p.month - 1, 1).toJsDate();
  // The day before the first of the next month, which handles the varying
  // Nepali month lengths without needing to know them.
  const nextMonth = p.month === 12 ? 1 : p.month + 1;
  const nextYear = p.month === 12 ? p.year + 1 : p.year;
  const nextFirst = new NepaliDate(nextYear, nextMonth - 1, 1).toJsDate();
  const last = new Date(nextFirst.getTime() - 864e5);

  return { from: iso(first), to: iso(last) };
}

/** The Nepali month we are standing in, as "2083-03". */
export function currentMonth(calendar: Calendar = "bs"): string {
  if (calendar === "ad") {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const n = new NepaliDate(new Date());
  return `${n.getYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

/** The previous month, which is usually the one being paid. */
export function previousMonth(month: string): string {
  const p = parseMonth(month);
  if (!p) return month;
  const m = p.month === 1 ? 12 : p.month - 1;
  const y = p.month === 1 ? p.year - 1 : p.year;
  return `${y}-${String(m).padStart(2, "0")}`;
}
