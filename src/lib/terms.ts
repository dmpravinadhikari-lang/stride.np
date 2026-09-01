/**
 * English interface, Nepali words only where the Nepali word IS the term.
 *
 * "NOC" and "lakh" are what students, parents, banks and consultancies actually
 * say. Translating them into unfamiliar English ("no-objection certificate",
 * "4.2 million") makes the product read as foreign. Everything else stays in
 * plain English.
 */

/** Terms we keep as-is, and what they mean if a screen needs to explain one. */
export const NEPALI_TERMS: Record<string, string> = {
  NOC: "No Objection Certificate from the Ministry of Education — required before you can send fees abroad",
  lakh: "one hundred thousand (1,00,000)",
  crore: "ten million (1,00,00,000)",
  "+2": "Higher secondary, classes 11 and 12",
  SEE: "Secondary Education Examination, taken at the end of class 10",
  "bank balance certificate": "The bank letter confirming the balance held, used as proof of funds",
  "tax clearance": "The IRD certificate showing a sponsor's declared income",
  "source of income": "The documents proving where a sponsor's money comes from",
};

/**
 * Money the way Nepali families say it: "NPR 42 lakh", not "NPR 4,200,000".
 * Falls back to grouped digits below a lakh.
 */
export function npr(amount: number | null | undefined, opts: { exact?: boolean } = {}): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "not stated";
  const grouped = `NPR ${amount.toLocaleString("en-IN")}`;
  if (opts.exact || amount < 100000) return grouped;

  const crore = amount / 10000000;
  const lakh = amount / 100000;
  const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

  return amount >= 10000000
    ? `NPR ${trim(crore)} crore`
    : `NPR ${trim(lakh)} lakh`;
}

/** Both forms, for screens where the exact figure also matters. */
export const nprFull = (amount: number | null | undefined) =>
  amount === null || amount === undefined ? "not stated" : `${npr(amount)} (${amount.toLocaleString("en-IN")})`;

/**
 * Appended to every AI system prompt so the model writes the way people here
 * speak, without drifting into full Nepali.
 */
export const LANGUAGE_RULE = `
Write in English. Keep these Nepali terms as they are, because they are the real terms and translating them reads as foreign: NOC, lakh, crore, +2, SEE, bank balance certificate, tax clearance, source of income, ward office.
Give money as "NPR 42 lakh" rather than "NPR 4,200,000", except where an exact figure is the point.
Do not write sentences in Nepali, and do not use Devanagari script.`;
