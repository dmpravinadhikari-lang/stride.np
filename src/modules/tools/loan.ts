/**
 * Education loan maths, the way Nepali banks actually write these loans.
 *
 * The part every generic EMI calculator gets wrong for students: the
 * moratorium. Nepali education loans typically charge no principal during the
 * course plus a grace period, but interest either accrues or is serviced
 * monthly. Which of those two it is changes the total by lakhs.
 */
export type LoanInput = {
  amountNpr: number;
  annualRatePct: number;
  /** Repayment years AFTER the moratorium ends. */
  termYears: number;
  /** Course length plus grace period, in months. */
  moratoriumMonths: number;
  /** During the moratorium: pay the interest monthly, or let it capitalise. */
  duringStudy: "service-interest" | "capitalise";
};

export type LoanResult = {
  emi: number;
  /** What is owed when repayment starts. */
  principalAtRepayment: number;
  interestDuringMoratorium: number;
  /** Paid monthly during study, if servicing. */
  monthlyDuringStudy: number;
  totalInterest: number;
  totalRepaid: number;
  /** Multiple of the original loan actually handed back. */
  multiple: number;
};

export function calcLoan(i: LoanInput): LoanResult {
  const P = Math.max(0, i.amountNpr);
  const r = i.annualRatePct / 100 / 12;
  const n = Math.max(1, Math.round(i.termYears * 12));
  const m = Math.max(0, Math.round(i.moratoriumMonths));

  const interestDuringMoratorium = P * r * m;

  // Capitalised interest is added to the principal and then itself earns
  // interest for the whole repayment term. Serviced interest does not.
  const principalAtRepayment = i.duringStudy === "capitalise" ? P + interestDuringMoratorium : P;
  const monthlyDuringStudy = i.duringStudy === "service-interest" ? P * r : 0;

  const emi = r === 0
    ? principalAtRepayment / n
    : (principalAtRepayment * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const repaidInInstalments = emi * n;
  const servicedTotal = monthlyDuringStudy * m;
  const totalRepaid = repaidInInstalments + servicedTotal;
  const totalInterest = totalRepaid - P;

  return {
    emi: Math.round(emi),
    principalAtRepayment: Math.round(principalAtRepayment),
    interestDuringMoratorium: Math.round(interestDuringMoratorium),
    monthlyDuringStudy: Math.round(monthlyDuringStudy),
    totalInterest: Math.round(totalInterest),
    totalRepaid: Math.round(totalRepaid),
    multiple: P > 0 ? Number((totalRepaid / P).toFixed(2)) : 0,
  };
}

/**
 * Whether a sponsor's declared income plausibly supports the loan, which is
 * the question a bank and a visa officer both ask.
 */
export function serviceability(emi: number, annualIncomeNpr: number) {
  const monthly = annualIncomeNpr / 12;
  if (monthly <= 0) return { ratio: null as number | null, verdict: "unknown" as const, note: "Enter the sponsor's annual income to see whether the repayment is plausible." };
  const ratio = emi / monthly;
  if (ratio <= 0.4) return { ratio, verdict: "comfortable" as const, note: "The repayment is a manageable share of declared income. Banks generally look for under 40 to 50 per cent." };
  if (ratio <= 0.6) return { ratio, verdict: "tight" as const, note: "Tight. A bank may ask for a second earner as co-applicant, or more collateral." };
  return { ratio, verdict: "unlikely" as const, note: "The repayment exceeds what this declared income comfortably supports. Expect the bank to reduce the amount, or to require another income source on the application." };
}

/** Indicative, and the reason the rate field is editable. */
export const TYPICAL_RATE = 11;
export const RATE_NOTE =
  "Nepali banks have commonly quoted education loans in the region of 10 to 13 per cent, secured against property. Your actual rate depends on the bank, the collateral and the relationship — ask for it in writing.";
