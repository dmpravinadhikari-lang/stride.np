import type { Uni } from "@/modules/finder/universities";
import { FX_NPR, type Level } from "@/modules/cost/data";

export type Criteria = {
  country: string;
  level: Level;
  field: string;
  /** Annual budget the family can carry, in NPR. */
  budgetNpr: number;
  ielts: number;
  percent: number;
};

export type Match = {
  uni: Uni;
  score: number;
  verdict: "reach" | "likely" | "safe" | "out";
  reasons: string[];
  blockers: string[];
};

/**
 * Honest matching. A university the student cannot afford or cannot meet the
 * English requirement for is shown as out of reach, with the reason — not
 * hidden, and not dressed up as a possibility.
 */
export function matchUniversities(list: Uni[], c: Criteria): Match[] {
  return list
    .filter((u) => (!c.country || u.country === c.country) && u.levels.includes(c.level))
    .filter((u) => !c.field || u.fields.includes(c.field))
    .map((uni) => {
      const reasons: string[] = [];
      const blockers: string[] = [];
      let score = 50;

      const rate = FX_NPR[
        ({ AU: "AUD", NZ: "NZD", UK: "GBP", IE: "EUR", US: "USD", CA: "CAD" } as Record<string, keyof typeof FX_NPR>)[uni.country]
      ];
      const lowNpr = uni.tuitionLow * rate;

      if (c.budgetNpr > 0) {
        if (c.budgetNpr >= uni.tuitionHigh * rate) { score += 20; reasons.push("Comfortably inside your budget"); }
        else if (c.budgetNpr >= lowNpr) { score += 8; reasons.push("Affordable at the lower end of their fee range"); }
        else { score -= 30; blockers.push(`Tuition starts around NPR ${Math.round(lowNpr / 100000)} lakh a year, above your stated budget`); }
      }

      if (c.ielts > 0) {
        if (c.ielts >= uni.ielts + 0.5) { score += 15; reasons.push("English score comfortably above their minimum"); }
        else if (c.ielts >= uni.ielts) { score += 8; reasons.push("Meets the English requirement"); }
        else { score -= 35; blockers.push(`Needs IELTS ${uni.ielts}; you have ${c.ielts}`); }
      }

      if (c.percent > 0) {
        if (c.percent >= uni.minPercent + 10) { score += 15; reasons.push("Academic record well above their minimum"); }
        else if (c.percent >= uni.minPercent) { score += 8; reasons.push("Meets the academic requirement"); }
        else { score -= 25; blockers.push(`Usually wants around ${uni.minPercent}%; you have ${c.percent}%`); }
      }

      if (uni.intakes.length >= 3) { score += 5; reasons.push("Three intakes a year, so a missed deadline is not a lost year"); }
      if (uni.note) reasons.push(uni.note);

      const verdict: Match["verdict"] =
        blockers.length > 1 ? "out" : blockers.length === 1 ? "reach" : score >= 85 ? "safe" : "likely";

      return { uni, score: Math.max(0, Math.min(100, score)), verdict, reasons, blockers };
    })
    .sort((a, b) => b.score - a.score);
}

export const VERDICT = {
  safe: { label: "Strong fit", tone: "teal" },
  likely: { label: "Worth applying", tone: "brand" },
  reach: { label: "A stretch", tone: "gold" },
  out: { label: "Not realistic yet", tone: "danger" },
} as const;
