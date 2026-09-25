import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { daysFromToday } from "@/lib/dates";

/**
 * Market intelligence.
 *
 * What a consultancy owner cannot get from their own database: what the
 * market is searching for, what changed in the rules and when it bites, and
 * which intake is closing next. It is read from JSON in content/market so the
 * office, or a feed, can update it without a deploy.
 *
 * Every file carries the date it was compiled and where it came from, and
 * both are shown on the page. A figure with no date on it is a figure
 * somebody will quote to a student two years from now.
 */

const dir = join(process.cwd(), "content", "market");
const read = <T>(file: string): T => JSON.parse(readFileSync(join(dir, file), "utf8")) as T;

export type Keyword = {
  term: string; volume: number; change: number;
  intent: "destination" | "test" | "visa" | "money" | "process" | "consultancy";
  destination: string | null;
};
export type Movement = {
  id: string; destination: string | null; headline: string; effectiveOn: string;
  direction: "harder" | "easier" | "process" | "opportunity";
  whatItMeans: string; sourceName: string; sourceUrl: string | null;
};
export type Intake = { destination: string; intake: string; applyBy: string; note: string };

type File<T> = { asOf: string; source: string; note: string } & T;

export const keywords = () => read<File<{ geo: string; keywords: Keyword[] }>>("keywords.json");
export const movements = () => read<File<{ movements: Movement[] }>>("movements.json");
export const intakes = () => read<File<{ intakes: Intake[] }>>("intakes.json");

/** Rules that have already landed, newest first, and what is still coming. */
export function splitMovements() {
  const all = movements();
  const rows = [...all.movements].sort((a, b) => b.effectiveOn.localeCompare(a.effectiveOn));
  return {
    asOf: all.asOf,
    source: all.source,
    coming: rows.filter((m) => daysFromToday(m.effectiveOn) > 0).reverse(),
    landed: rows.filter((m) => daysFromToday(m.effectiveOn) <= 0),
  };
}

/** The next deadline per destination, closest first. Past windows drop out. */
export function openIntakes() {
  const all = intakes();
  const rows = all.intakes
    .map((i) => ({ ...i, daysLeft: daysFromToday(i.applyBy) }))
    .filter((i) => i.daysLeft >= -7)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return { asOf: all.asOf, rows };
}

/** Where demand is growing, and where it is falling away. */
export function demand() {
  const all = keywords();
  const rows = [...all.keywords].sort((a, b) => b.volume - a.volume);
  return {
    asOf: all.asOf,
    source: all.source,
    note: all.note,
    geo: all.geo,
    rows,
    rising: [...rows].sort((a, b) => b.change - a.change).slice(0, 4),
    falling: [...rows].sort((a, b) => a.change - b.change).filter((r) => r.change < 0),
    /** Total monthly searches behind each destination, for the demand bar. */
    byDestination: Object.entries(
      rows.reduce<Record<string, number>>((acc, r) => {
        if (!r.destination) return acc;
        acc[r.destination] = (acc[r.destination] ?? 0) + r.volume;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]),
  };
}
