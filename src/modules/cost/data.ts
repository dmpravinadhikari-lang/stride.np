import type { CountryCode } from "@/lib/countries";

/**
 * Cost and visa-funds data.
 *
 * TWO KINDS OF NUMBER LIVE HERE AND THEY ARE NOT THE SAME THING:
 *
 *  - `visaFunds` is a RULE. It is the amount the destination's immigration
 *    authority requires you to demonstrate. These are published figures and are
 *    quoted with their source and date.
 *  - everything else is an ESTIMATE, indicative ranges for planning. A student
 *    with a real offer letter should type their actual tuition in and ignore
 *    the range.
 *
 * The screen labels which is which. Never present an estimate as a requirement.
 *
 * WHEN FIGURES CHANGE, EDIT THIS FILE. Nothing else needs touching.
 */

export const RATES_AS_OF = "August 2026";

/** Indicative NPR per unit of foreign currency. Update alongside RATES_AS_OF. */
export const FX_NPR: Record<string, number> = {
  AUD: 90, NZD: 82, GBP: 178, EUR: 152, USD: 138, CAD: 98,
};

export type Level = "diploma" | "bachelors" | "masters";

export type CountryCost = {
  currency: keyof typeof FX_NPR;
  /** Indicative annual tuition, in the destination currency. */
  tuition: Record<Level, { low: number; typical: number; high: number }>;
  /** Typical course length in years, by level. */
  years: Record<Level, number>;
  /** Realistic annual living cost, which is not the same as the visa figure. */
  living: { low: number; typical: number; high: number };
  visaFee: number;
  healthCoverPerYear: number;
  healthCoverName: string;
  /** One-off costs before departure, in the destination currency unless noted. */
  oneOff: { flightNpr: number; otherNpr: number };
  /** The published requirement. */
  visaFunds: {
    /** Living-cost component the authority requires you to show. */
    living: number;
    /** How the total is built. */
    formula: string;
    /** Where the figure comes from, and when it applies. */
    source: string;
    /** How long the money must have been sitting in the account. */
    holding: string;
  };
};

export const COST: Record<CountryCode, CountryCost> = {
  AU: {
    currency: "AUD",
    tuition: { diploma: { low: 14000, typical: 20000, high: 28000 }, bachelors: { low: 22000, typical: 33000, high: 45000 }, masters: { low: 26000, typical: 36000, high: 50000 } },
    years: { diploma: 1.5, bachelors: 3, masters: 2 },
    living: { low: 22000, typical: 29000, high: 38000 },
    visaFee: 2000,
    healthCoverPerYear: 700, healthCoverName: "OSHC",
    oneOff: { flightNpr: 95000, otherNpr: 90000 },
    visaFunds: {
      living: 29710,
      formula: "12 months of living costs (AUD 29,710) + 12 months tuition + return travel",
      source: "Department of Home Affairs financial capacity requirement, 2026",
      holding: "Funds should be genuinely available; recent large deposits invite questions.",
    },
  },
  NZ: {
    currency: "NZD",
    tuition: { diploma: { low: 18000, typical: 23000, high: 30000 }, bachelors: { low: 22000, typical: 30000, high: 40000 }, masters: { low: 26000, typical: 36000, high: 48000 } },
    years: { diploma: 1.5, bachelors: 3, masters: 2 },
    living: { low: 16000, typical: 20000, high: 27000 },
    visaFee: 750,
    healthCoverPerYear: 700, healthCoverName: "Health and travel insurance",
    oneOff: { flightNpr: 105000, otherNpr: 85000 },
    visaFunds: {
      living: 20000,
      formula: "NZD 20,000 per year of living costs + full tuition for the year",
      source: "Immigration New Zealand, 2026 (NZD 1,667 per month for courses under a year)",
      holding: "Bank statements or an approved scholarship; funds must be verifiable.",
    },
  },
  UK: {
    currency: "GBP",
    tuition: { diploma: { low: 9000, typical: 12000, high: 16000 }, bachelors: { low: 12000, typical: 17000, high: 26000 }, masters: { low: 14000, typical: 19000, high: 32000 } },
    years: { diploma: 1, bachelors: 3, masters: 1 },
    living: { low: 9500, typical: 12500, high: 18000 },
    visaFee: 524,
    healthCoverPerYear: 776, healthCoverName: "Immigration Health Surcharge",
    oneOff: { flightNpr: 85000, otherNpr: 80000 },
    visaFunds: {
      living: 10539,
      formula: "£1,171 per month for 9 months outside London (£10,539), or £1,529 in London (£13,761), + unpaid tuition for year one",
      source: "UKVI maintenance requirement, 2025-26 academic year onwards",
      holding: "The money must sit in the account for 28 consecutive days, ending no more than 31 days before you apply.",
    },
  },
  IE: {
    currency: "EUR",
    tuition: { diploma: { low: 9000, typical: 12000, high: 15000 }, bachelors: { low: 10000, typical: 15000, high: 25000 }, masters: { low: 12000, typical: 18000, high: 28000 } },
    years: { diploma: 1, bachelors: 3, masters: 1 },
    living: { low: 10000, typical: 13000, high: 18000 },
    visaFee: 60,
    healthCoverPerYear: 500, healthCoverName: "Private medical insurance",
    oneOff: { flightNpr: 90000, otherNpr: 80000 },
    visaFunds: {
      living: 10000,
      formula: "€10,000 immediately available for a course over 8 months (€833 per month, or €6,665 for shorter courses) + tuition",
      source: "Irish Immigration Service, requirement for courses beginning after 1 July 2023",
      holding: "Bank statements typically covering six months.",
    },
  },
  US: {
    currency: "USD",
    tuition: { diploma: { low: 8000, typical: 14000, high: 22000 }, bachelors: { low: 15000, typical: 28000, high: 55000 }, masters: { low: 18000, typical: 32000, high: 60000 } },
    years: { diploma: 2, bachelors: 4, masters: 2 },
    living: { low: 10000, typical: 15000, high: 24000 },
    visaFee: 185,
    healthCoverPerYear: 1800, healthCoverName: "Student health insurance",
    oneOff: { flightNpr: 130000, otherNpr: 120000 },
    visaFunds: {
      living: 0,
      formula: "No fixed figure. You must show funds covering the first year's cost of attendance exactly as printed on your I-20, plus the SEVIS fee.",
      source: "US Department of State, the I-20 sets the amount, not a national threshold",
      holding: "Consular officers look at where the money came from as much as how much there is.",
    },
  },
  CA: {
    currency: "CAD",
    tuition: { diploma: { low: 14000, typical: 18000, high: 24000 }, bachelors: { low: 20000, typical: 30000, high: 45000 }, masters: { low: 18000, typical: 28000, high: 45000 } },
    years: { diploma: 2, bachelors: 4, masters: 2 },
    living: { low: 15000, typical: 20000, high: 27000 },
    visaFee: 235,
    healthCoverPerYear: 800, healthCoverName: "Provincial or private health cover",
    oneOff: { flightNpr: 125000, otherNpr: 110000 },
    visaFunds: {
      living: 23448,
      formula: "CAD 23,448 living costs for a single applicant + first year tuition + return travel",
      source: "IRCC cost-of-living threshold, applications from 1 September 2026 (was CAD 22,895)",
      holding: "A GIC is the usual route and satisfies the living-cost portion.",
    },
  },
};

export const LEVEL_LABEL: Record<Level, string> = {
  diploma: "Diploma / Certificate", bachelors: "Bachelors", masters: "Masters",
};
