/**
 * Rate limiting — SPEC §5.4.
 *
 * Phase 1 has no accounts, so IP is the only handle available: 10 custom
 * generations per IP per day. The per-phone limit of 3 lands in Phase 3 with
 * OTP verification; countCustom() already takes an optional subject so that
 * only needs a second call, not a rewrite.
 *
 * Cache hits are deliberately NOT counted. Browsing the catalogue costs
 * nothing, so limiting it would only punish the visitors we want.
 */
import { type Env, settings, today } from './env.ts';

const TTL_SECONDS = 60 * 60 * 36;

export interface RateState {
  used: number;
  limit: number;
  allowed: boolean;
  remaining: number;
}

function key(kind: string, subject: string): string {
  return `rl:${kind}:${subject}:${today()}`;
}

/** Checks without consuming, so a refusal never burns the visitor's quota. */
export async function checkIpLimit(
  env: Env,
  ip: string,
): Promise<RateState> {
  const { ratePerIpPerDay } = settings(env);
  const used = Number(await env.METER.get(key('ip', ip))) || 0;

  return {
    used,
    limit: ratePerIpPerDay,
    allowed: used < ratePerIpPerDay,
    remaining: Math.max(ratePerIpPerDay - used, 0),
  };
}

/** Consumed only once a live generation actually happens. */
export async function consumeIpLimit(env: Env, ip: string): Promise<void> {
  const k = key('ip', ip);
  const used = Number(await env.METER.get(k)) || 0;
  await env.METER.put(k, String(used + 1), { expirationTtl: TTL_SECONDS });
}

/**
 * Client IP as Cloudflare sees it. CF-Connecting-IP is set by the edge and
 * cannot be spoofed by the client, unlike X-Forwarded-For.
 */
export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown';
}
