/**
 * Raw marks to IELTS bands.
 *
 * The published conversion is for a 40-question paper. A practice paper with
 * fewer questions is scaled to 40 first, which is what every reputable
 * practice provider does. The band is indicative, not an official result, and
 * the report says so on screen.
 */

type Row = [minRaw: number, band: number];

const READING: Row[] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6],
  [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [0, 2],
];

const LISTENING: Row[] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6],
  [18, 5.5], [16, 5], [13, 4.5], [11, 4], [8, 3.5], [6, 3], [4, 2.5], [0, 2],
];

export function bandFromRaw(kind: "reading" | "listening", raw: number, outOf: number): number {
  if (outOf <= 0) return 0;
  const scaled = Math.round((raw / outOf) * 40);
  const table = kind === "reading" ? READING : LISTENING;
  for (const [min, band] of table) if (scaled >= min) return band;
  return 2;
}

/** IELTS rounds a skill average to the nearest half band; .25 goes up to .5 and .75 up to the next whole. */
export function roundBand(value: number): number {
  const whole = Math.floor(value);
  const rest = value - whole;
  if (rest < 0.25) return whole;
  if (rest < 0.75) return whole + 0.5;
  return whole + 1;
}

export function overallBand(bands: Array<number | null | undefined>): number | null {
  const present = bands.filter((b): b is number => typeof b === "number" && b > 0);
  if (present.length === 0) return null;
  return roundBand(present.reduce((a, b) => a + b, 0) / present.length);
}

export const showBand = (b: number | null | undefined) =>
  b === null || b === undefined ? ", " : b.toFixed(1).replace(/\.0$/, ".0");

export const bandTone = (b: number | null | undefined) =>
  b === null || b === undefined ? "grey" : b >= 7 ? "teal" : b >= 6 ? "gold" : "danger";

/** What a band actually buys a student, which is the only reason they care. */
export function bandMeaning(band: number): string {
  if (band >= 8) return "Above what any Australian, UK, US or Canadian university will ask for.";
  if (band >= 7) return "Meets the requirement for most masters programmes and all four destinations.";
  if (band >= 6.5) return "Enough for many masters courses; some UK and Australian programmes want 7.";
  if (band >= 6) return "Enough for most undergraduate courses and many diplomas.";
  if (band >= 5.5) return "Below most degree requirements. Enough for some diploma and pathway courses.";
  return "Below the level any of your destinations will accept. Preparation, not application.";
}
