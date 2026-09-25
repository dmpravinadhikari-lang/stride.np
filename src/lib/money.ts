/**
 * Prices, shown in the currency the person reading is thinking in.
 *
 * The list is set here, not fetched. A pricing page that moves with the
 * market would quote a different number to the same person twice in one week,
 * and a rate that drifts is worse than a rate that is honestly stale, so each
 * one carries the date it was set and the page says it is indicative.
 *
 * NPR is the currency of record: that is what an invoice is raised in. The
 * rest are a courtesy, rounded to something a human would say out loud rather
 * than to the cent.
 */
export const RATES_SET_ON = "2026-09-01";

export const CURRENCIES = {
  NPR: { code: "NPR", symbol: "Rs", perNpr: 1, label: "Nepali rupee", round: 1 },
  USD: { code: "USD", symbol: "$", perNpr: 1 / 139, label: "US dollar", round: 1 },
  GBP: { code: "GBP", symbol: "£", perNpr: 1 / 176, label: "Pound sterling", round: 1 },
  AUD: { code: "AUD", symbol: "A$", perNpr: 1 / 92, label: "Australian dollar", round: 1 },
  CAD: { code: "CAD", symbol: "C$", perNpr: 1 / 101, label: "Canadian dollar", round: 1 },
  EUR: { code: "EUR", symbol: "€", perNpr: 1 / 150, label: "Euro", round: 1 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

/** What the plan costs in one currency, as a string somebody would say. */
export function price(npr: number, code: CurrencyCode): string {
  const c = CURRENCIES[code];
  const value = npr * c.perNpr;
  if (code === "NPR") return `${c.symbol} ${Math.round(value).toLocaleString("en-IN")}`;
  // Under a hundred, whole numbers read better than decimals on a price card.
  const rounded = value >= 100 ? Math.round(value / 5) * 5 : Math.round(value);
  return `${c.symbol}${rounded.toLocaleString("en-US")}`;
}
