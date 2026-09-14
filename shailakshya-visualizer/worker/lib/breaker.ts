/**
 * Global daily circuit breaker — SPEC §5.5.
 *
 * Tracks estimated Neuron spend for the day and stops live generation once it
 * crosses the threshold, so the free tier cannot be exhausted by a traffic
 * spike or a scraper. Past the line the visitor is offered cached designs and a
 * callback, which is itself the lead capture.
 *
 * The counter is KV, so it is eventually consistent: under heavy concurrency
 * the true spend can overshoot the threshold slightly. That is why the default
 * threshold is 0.8 rather than 1.0 — the 20% headroom absorbs the drift. If
 * this ever needs to be exact, move the counter to a Durable Object; nothing
 * outside this file would change.
 */
import { type Env, settings, today } from './env.ts';

const spendKey = (day: string) => `spend:${day}`;

/** Two days, so a counter written just before midnight is still readable. */
const SPEND_TTL_SECONDS = 60 * 60 * 48;

export interface BudgetState {
  spent: number;
  budget: number;
  /** Spend at which live generation stops. */
  ceiling: number;
  /** True when live generation is still allowed. */
  open: boolean;
  remaining: number;
}

export async function budgetState(env: Env): Promise<BudgetState> {
  const { dailyNeuronBudget, breakerThreshold } = settings(env);
  const raw = await env.METER.get(spendKey(today()));
  const spent = Number(raw) || 0;
  const ceiling = dailyNeuronBudget * breakerThreshold;

  return {
    spent,
    budget: dailyNeuronBudget,
    ceiling,
    open: spent < ceiling,
    remaining: Math.max(ceiling - spent, 0),
  };
}

/**
 * Records spend after a generation. Called with the estimate the provider
 * reports; on a cache hit it is never called at all.
 */
export async function recordSpend(env: Env, neurons: number): Promise<void> {
  if (neurons <= 0) return;

  const day = today();
  const key = spendKey(day);
  const current = Number(await env.METER.get(key)) || 0;

  await env.METER.put(key, String(current + neurons), {
    expirationTtl: SPEND_TTL_SECONDS,
  });
}

/** Test hook, and how an operator forces the breaker shut for a drill. */
export async function setSpend(env: Env, neurons: number): Promise<void> {
  await env.METER.put(spendKey(today()), String(neurons), {
    expirationTtl: SPEND_TTL_SECONDS,
  });
}
