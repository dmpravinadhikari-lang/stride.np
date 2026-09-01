/**
 * Approximate published rates, US dollars per million tokens. Used only to
 * estimate what a request would cost so the usage meter is meaningful even
 * while you are on the free local CLI. Update when rates change.
 */
export const RATES: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-opus-5": { in: 15, out: 75 },
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
  default: { in: 3, out: 15 },
};

export function estimateCost(model: string, inTok: number, outTok: number): number {
  const r = RATES[model] ?? RATES.default;
  return (inTok / 1e6) * r.in + (outTok / 1e6) * r.out;
}

/** Rough token count — good enough for metering, not for billing. */
export const roughTokens = (text: string) => Math.ceil(text.length / 3.8);
