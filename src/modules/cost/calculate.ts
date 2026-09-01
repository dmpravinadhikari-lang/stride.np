import { COST, FX_NPR, type Level } from "@/modules/cost/data";
import type { CountryCode } from "@/lib/countries";

export type Inputs = {
  country: CountryCode;
  level: Level;
  years: number;
  /** Actual annual tuition from an offer letter, in the destination currency. */
  tuition: number;
  /** Which living-cost band to plan on. */
  livingBand: "low" | "typical" | "high";
  londonOrEquivalent: boolean;
  /** What the family already has, in NPR. */
  savingsNpr: number;
  /** Annual sponsor income, in NPR. */
  sponsorIncomeNpr: number;
  /** Part-time earnings the student expects per year, in destination currency. */
  partTime: number;
};

export type Line = { label: string; npr: number; note?: string };

export type Result = {
  currency: string;
  rate: number;
  /** What must be paid or shown before departure. */
  beforeYouGo: Line[];
  beforeYouGoTotal: number;
  /** The whole course. */
  wholeCourse: Line[];
  wholeCourseTotal: number;
  /** The published visa requirement — a rule, not an estimate. */
  visaFunds: { npr: number; foreign: number; formula: string; source: string; holding: string };
  /** After savings, what is left to find. */
  gapNpr: number;
  /** Years of the sponsor's declared income the whole course represents. */
  incomeYears: number | null;
  /** What part-time work might realistically cover across the course. */
  partTimeOffsetNpr: number;
};

const round = (n: number) => Math.round(n / 1000) * 1000;

export function calculate(input: Inputs): Result {
  const c = COST[input.country];
  const rate = FX_NPR[c.currency];
  const toNpr = (foreign: number) => foreign * rate;

  const living = c.living[input.livingBand];
  const years = Math.max(0.5, input.years);
  const tuition = input.tuition > 0 ? input.tuition : c.tuition[input.level].typical;

  // ---- before you go
  const beforeYouGo: Line[] = [
    { label: "First year tuition", npr: round(toNpr(tuition)), note: "Most institutions want at least the first semester up front." },
    { label: `Visa application fee`, npr: round(toNpr(c.visaFee)) },
    { label: c.healthCoverName, npr: round(toNpr(c.healthCoverPerYear)), note: "Usually paid for the whole visa length at once." },
    { label: "Flight from Kathmandu", npr: c.oneOff.flightNpr },
    { label: "NOC, translation, notarisation, courier, biometrics", npr: c.oneOff.otherNpr, note: "The small costs nobody budgets for, together." },
    { label: "First three months of living costs", npr: round(toNpr((living / 12) * 3)), note: "Before any part-time work starts paying." },
  ];
  const beforeYouGoTotal = beforeYouGo.reduce((s, l) => s + l.npr, 0);

  // ---- the whole course
  const wholeCourse: Line[] = [
    { label: `Tuition, ${years} year${years === 1 ? "" : "s"}`, npr: round(toNpr(tuition * years)) },
    { label: `Living costs, ${years} year${years === 1 ? "" : "s"}`, npr: round(toNpr(living * years)) },
    { label: c.healthCoverName, npr: round(toNpr(c.healthCoverPerYear * years)) },
    { label: "Visa, flights and one-off costs", npr: round(toNpr(c.visaFee)) + c.oneOff.flightNpr + c.oneOff.otherNpr },
  ];
  const wholeCourseTotal = wholeCourse.reduce((s, l) => s + l.npr, 0);

  // ---- the published requirement
  const livingRequirement = input.country === "UK" && input.londonOrEquivalent ? 13761 : c.visaFunds.living;
  const requiredForeign = livingRequirement + tuition;
  const visaFunds = {
    npr: round(toNpr(requiredForeign)),
    foreign: requiredForeign,
    formula: c.visaFunds.formula,
    source: c.visaFunds.source,
    holding: c.visaFunds.holding,
  };

  const partTimeOffsetNpr = round(toNpr(input.partTime * years));
  const gapNpr = Math.max(0, wholeCourseTotal - input.savingsNpr - partTimeOffsetNpr);
  const incomeYears = input.sponsorIncomeNpr > 0
    ? Number((wholeCourseTotal / input.sponsorIncomeNpr).toFixed(1))
    : null;

  return {
    currency: c.currency, rate,
    beforeYouGo, beforeYouGoTotal,
    wholeCourse, wholeCourseTotal,
    visaFunds, gapNpr, incomeYears, partTimeOffsetNpr,
  };
}
