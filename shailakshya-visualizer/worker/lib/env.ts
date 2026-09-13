/**
 * Worker bindings and settings.
 *
 * Everything tunable is a var rather than a constant so the company can change
 * the spend ceiling from the Cloudflare dashboard without a redeploy.
 */
export interface Env {
  AI: Ai;
  IMAGES: R2Bucket;
  CACHE: KVNamespace;
  METER: KVNamespace;
  ASSETS: Fetcher;

  IMAGE_PROVIDER: string;
  /**
   * Secret that enables the pre-generation endpoint. Set with
   * `wrangler secret put PREGENERATE_TOKEN`. Unset on a normal deploy, in
   * which case that route does not exist.
   */
  PREGENERATE_TOKEN?: string;
  DAILY_NEURON_BUDGET: string;
  BREAKER_THRESHOLD: string;
  RATE_LIMIT_PER_IP_PER_DAY: string;
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface Settings {
  provider: string;
  dailyNeuronBudget: number;
  breakerThreshold: number;
  ratePerIpPerDay: number;
}

export function settings(env: Env): Settings {
  return {
    provider: env.IMAGE_PROVIDER || 'mock',
    dailyNeuronBudget: num(env.DAILY_NEURON_BUDGET, 10_000),
    // Clamped: a threshold above 1 would disable the breaker entirely, which is
    // the one misconfiguration that actually costs money.
    breakerThreshold: Math.min(Math.max(num(env.BREAKER_THRESHOLD, 0.8), 0), 1),
    ratePerIpPerDay: num(env.RATE_LIMIT_PER_IP_PER_DAY, 10),
  };
}

/** UTC day stamp. All counters roll over on it. */
export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
