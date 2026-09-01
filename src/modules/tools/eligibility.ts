import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { COST, FX_NPR, type Level } from "@/modules/cost/data";

/**
 * A blunt eligibility check.
 *
 * Deliberately not encouraging. A student told "you look eligible!" when their
 * funds are short has been done a disservice — they will pay the application
 * fee and find out at the visa stage instead.
 */
export type EligibilityInput = {
  country: CountryCode;
  level: Level;
  /** Percentage equivalent of the last qualification. */
  percent: number;
  englishTest: "ielts" | "pte" | "toefl" | "duolingo" | "none";
  englishScore: number;
  studyGapYears: number;
  /** Everything the family can put behind this, in NPR. */
  fundsNpr: number;
  sponsorIncomeNpr: number;
  hasRefusal: boolean;
};

export type Finding = { severity: "pass" | "warn" | "fail"; title: string; detail: string };
export type EligibilityResult = {
  verdict: "likely" | "possible" | "not-yet";
  headline: string;
  findings: Finding[];
  /** The single most valuable thing to change. */
  nextStep: string;
};

/** Rough equivalences to IELTS overall, for a first-pass check only. */
function toIelts(test: EligibilityInput["englishTest"], score: number): number | null {
  if (test === "none" || score <= 0) return null;
  if (test === "ielts") return score;
  if (test === "pte") return score >= 76 ? 8 : score >= 65 ? 7 : score >= 58 ? 6.5 : score >= 50 ? 6 : 5.5;
  if (test === "toefl") return score >= 100 ? 7.5 : score >= 94 ? 7 : score >= 79 ? 6.5 : score >= 60 ? 6 : 5.5;
  return score >= 120 ? 7 : score >= 105 ? 6.5 : score >= 95 ? 6 : 5.5; // duolingo
}

export function checkEligibility(i: EligibilityInput): EligibilityResult {
  const c = COUNTRIES[i.country];
  const cost = COST[i.country];
  const rate = FX_NPR[cost.currency];
  const findings: Finding[] = [];

  // ---- academic
  const needPercent = i.level === "masters" ? 55 : 50;
  if (i.percent <= 0) {
    findings.push({ severity: "warn", title: "Academic result not given", detail: "Enter your last result to get a real answer." });
  } else if (i.percent >= needPercent + 10) {
    findings.push({ severity: "pass", title: "Academic record is comfortable", detail: `${i.percent}% is above what most institutions ask for at this level.` });
  } else if (i.percent >= needPercent) {
    findings.push({ severity: "warn", title: "Academic record is at the minimum", detail: `${i.percent}% meets typical entry, but your choice of institution will be limited and competitive courses are out.` });
  } else {
    findings.push({ severity: "fail", title: "Below typical entry requirements", detail: `Most institutions want around ${needPercent}% for ${i.level}. A pathway or diploma route is the realistic option.` });
  }

  // ---- english
  const ielts = toIelts(i.englishTest, i.englishScore);
  const needIelts = i.level === "masters" ? 6.5 : 6.0;
  if (ielts === null) {
    findings.push({ severity: "fail", title: "No English test yet", detail: `You will need roughly IELTS ${needIelts} overall, or the equivalent. Nothing moves until this exists.` });
  } else if (ielts >= needIelts + 0.5) {
    findings.push({ severity: "pass", title: "English is comfortably there", detail: `Equivalent to about IELTS ${ielts}, above the usual ${needIelts} requirement.` });
  } else if (ielts >= needIelts) {
    findings.push({ severity: "pass", title: "English meets the requirement", detail: `Equivalent to about IELTS ${ielts}. Check individual band minimums too — many courses require no band below 6.` });
  } else {
    findings.push({ severity: "fail", title: "English score is short", detail: `About IELTS ${ielts} against a typical ${needIelts}. Resit before applying; a low score narrows your options far more than a low GPA.` });
  }

  // ---- money, the part that actually decides it
  const tuition = cost.tuition[i.level].typical;
  const requiredForeign = cost.visaFunds.living + tuition;
  const requiredNpr = requiredForeign * rate;
  if (i.fundsNpr <= 0) {
    findings.push({ severity: "warn", title: "Funds not given", detail: `${c.name} expects you to show about NPR ${Math.round(requiredNpr / 100000)} lakh.` });
  } else if (i.fundsNpr >= requiredNpr) {
    findings.push({ severity: "pass", title: "Funds meet the requirement", detail: `${c.name} asks you to show roughly NPR ${Math.round(requiredNpr / 100000)} lakh, and you have stated more than that.` });
  } else {
    const shortfall = Math.round((requiredNpr - i.fundsNpr) / 100000);
    findings.push({ severity: "fail", title: `Short by about NPR ${shortfall} lakh`, detail: `${c.name} wants around NPR ${Math.round(requiredNpr / 100000)} lakh visible. An education loan against property is the usual way to close this — it is not a reason to stop.` });
  }

  if (i.sponsorIncomeNpr > 0) {
    const years = requiredNpr / i.sponsorIncomeNpr;
    if (years > 6) {
      findings.push({ severity: "warn", title: "Cost is large against your sponsor's income", detail: `The first-year requirement alone is about ${years.toFixed(1)} years of the declared income. Officers ask hard questions when that ratio is high, so the loan and collateral documents need to be airtight.` });
    }
  }

  // ---- the two things people forget
  if (i.studyGapYears >= 3) {
    findings.push({ severity: "warn", title: `A ${i.studyGapYears}-year study gap`, detail: "Not disqualifying, but it must be explained with evidence — employment letters, or a documented reason. An unexplained gap is read as something being hidden." });
  }
  if (i.hasRefusal) {
    findings.push({ severity: "warn", title: "A previous refusal", detail: "You must declare it. What matters is whether the reason for the refusal has actually been fixed — reapplying with the same file usually produces the same answer." });
  }

  const fails = findings.filter((f) => f.severity === "fail").length;
  const warns = findings.filter((f) => f.severity === "warn").length;
  const verdict = fails === 0 && warns <= 1 ? "likely" : fails <= 1 ? "possible" : "not-yet";

  const firstFail = findings.find((f) => f.severity === "fail");
  return {
    verdict,
    headline: verdict === "likely"
      ? `On what you have told us, ${c.name} looks realistic.`
      : verdict === "possible"
        ? `${c.name} is possible, but one thing needs fixing first.`
        : `${c.name} is not realistic yet on these numbers.`,
    findings,
    nextStep: firstFail
      ? `Deal with this first: ${firstFail.title.toLowerCase()}.`
      : "Nothing is blocking you. Get your documents together and start applying.",
  };
}
