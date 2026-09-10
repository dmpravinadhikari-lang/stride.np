/**
 * A number that explains itself.
 *
 * The whole point of this layer: a dashboard of bare figures makes a
 * non-technical owner guess. Is 62% activation good? Should 9 stalled files
 * worry me? Every metric here therefore carries four things, 
 *
 *   value    what it is
 *   meaning  what it is measuring, in one plain sentence
 *   verdict  whether it is fine, worth watching, or a problem
 *   action   the specific thing to do about it, or null when nothing is needed
 *
 * The thresholds are stated in code rather than left in someone's head, so a
 * verdict can be argued with and corrected rather than trusted blindly.
 */

export type Verdict = "good" | "watch" | "bad" | "neutral";

export type Metric = {
  id: string;
  label: string;
  /** Already formatted for display, "62%", "NPR 4,200", "9". */
  display: string;
  /** The raw number, for sorting and for the trend arrow. */
  value: number;
  meaning: string;
  verdict: Verdict;
  /** What to do. Null when the answer is "nothing, this is fine". */
  action: string | null;
  /** Change against the previous comparable period, as a percentage. */
  trend?: { pct: number; direction: "up" | "down" | "flat"; goodWhen: "up" | "down" };
  /** The denominator, so a rate is never shown without the count behind it. */
  basis?: string;
};

export const pct = (part: number, whole: number): number =>
  whole <= 0 ? 0 : Math.round((part / whole) * 100);

export const fmtPct = (n: number) => `${n}%`;

/**
 * Bands a rate against thresholds. `higherIsBetter` flips the comparison so a
 * stall rate and an activation rate can both use one function.
 */
export function band(
  value: number,
  { good, watch, higherIsBetter = true }: { good: number; watch: number; higherIsBetter?: boolean },
): Verdict {
  if (higherIsBetter) {
    if (value >= good) return "good";
    if (value >= watch) return "watch";
    return "bad";
  }
  if (value <= good) return "good";
  if (value <= watch) return "watch";
  return "bad";
}

/** Percentage change, guarding the divide-by-zero that makes dashboards lie. */
export function trend(
  now: number,
  before: number,
  goodWhen: "up" | "down" = "up",
): Metric["trend"] {
  if (before === 0) {
    // Going from nothing to something is not "infinity per cent", and saying
    // so is how a dashboard loses credibility. Report it as flat and let the
    // absolute number speak.
    return { pct: 0, direction: now > 0 ? "up" : "flat", goodWhen };
  }
  const change = Math.round(((now - before) / before) * 100);
  return {
    pct: Math.abs(change),
    direction: change > 2 ? "up" : change < -2 ? "down" : "flat",
    goodWhen,
  };
}

/** Whether a trend arrow should read as encouraging. */
export const trendIsGood = (t: Metric["trend"]): boolean | null => {
  if (!t || t.direction === "flat") return null;
  return t.direction === t.goodWhen;
};

export const VERDICT_STYLE: Record<Verdict, { tint: string; word: string }> = {
  good:    { tint: "mint",  word: "Healthy" },
  watch:   { tint: "amber", word: "Worth watching" },
  bad:     { tint: "rose",  word: "Needs attention" },
  neutral: { tint: "sky",   word: "For information" },
};
