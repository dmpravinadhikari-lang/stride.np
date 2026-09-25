import { headers } from "next/headers";

/**
 * A sliding-window rate limiter held in memory.
 *
 * WHAT THIS IS FOR: stopping password guessing, signup floods and credit
 * draining. It is not DDoS protection, a real flood is absorbed in front of
 * the application, by Caddy's own limits and by Cloudflare or similar. What it
 * does stop is the cheap, single-machine abuse that would otherwise cost real
 * money the moment an API key is live.
 *
 * LIMITATION, stated plainly: the counters live in this process. One Contabo
 * box running one Node process is exactly that, so this works today. If STRIDE
 * is ever run as more than one process, these move to the database or Redis or
 * they stop meaning anything.
 */
type Hit = { count: number; resetAt: number };

const g = globalThis as unknown as { __strideLimits?: Map<string, Hit> };
const buckets = (g.__strideLimits ??= new Map<string, Hit>());

/** Occasional sweep so an idle process does not grow forever. */
function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, hit] of buckets) if (hit.resetAt <= now) buckets.delete(key);
}

export type Verdict = { ok: boolean; remaining: number; retryAfterSeconds: number };

export function hit(key: string, limit: number, windowSeconds: number): Verdict {
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return existing.count > limit
    ? { ok: false, remaining: 0, retryAfterSeconds }
    : { ok: true, remaining: limit - existing.count, retryAfterSeconds };
}

/** Clears a bucket, called after a success so honest users are not punished. */
export const reset = (key: string) => { buckets.delete(key); };

/** Behind Caddy the real address arrives in x-forwarded-for. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export const LIMITS = {
  /*
   * Two login limits, and they are not the same size on purpose.
   *
   * The per-account one is the real control against somebody grinding a
   * password list, and stays tight. The per-address one only exists to slow
   * spraying across many accounts, and it was as tight as the other: eight
   * sign-ins from one address in fifteen minutes. A Nepali consultancy is
   * twenty people behind one router arriving at ten in the morning, so the
   * ninth colleague to open their laptop was told to wait, which is the
   * product breaking for the customer in order to defend them from nobody.
   * A correct password also clears this counter.
   */
  login:        { limit: 8,  window: 15 * 60, message: "Too many sign-in attempts. Wait a few minutes and try again." },
  loginIp:      { limit: 60, window: 15 * 60, message: "A lot of sign-ins from this connection. Wait a few minutes and try again." },
  // Six links an hour for one address, which is more than anybody who has
  // genuinely forgotten needs, and not enough to fill somebody's inbox.
  passwordReset:{ limit: 6,  window: 60 * 60, message: "That is a lot of reset links. Wait a little and try again." },
  signup:       { limit: 5,  window: 60 * 60, message: "Too many accounts created from here. Try again later." },
  parentCode:   { limit: 6,  window: 15 * 60, message: "Too many wrong codes. Wait a few minutes, or ask the counsellor to read it out again." },
  aiAction:     { limit: 40, window: 60 * 60, message: "That is a lot of AI requests in one hour. Wait a little and carry on." },
  upload:       { limit: 40, window: 60 * 60, message: "Too many uploads in one hour. Wait a little and carry on." },
  googleStart:  { limit: 15, window: 15 * 60, message: "Too many sign-in attempts." },
  count:        { limit: 60, window: 10 * 60, message: "Too many requests." },
  // The reception tablet. Generous, because a busy Saturday at one desk is a
  // real thirty enquiries, and tight enough that the public link cannot be
  // used to fill somebody's board with rubbish.
  walkIn:       { limit: 30, window: 60 * 60, message: "Too many enquiries from here in one hour. Ask at the desk." },
} as const;

/** Convenience: one call, keyed by IP plus whatever else identifies the actor. */
export async function guard(
  which: keyof typeof LIMITS,
  extraKey = "",
): Promise<{ ok: true } | { ok: false; message: string }> {
  const rule = LIMITS[which];
  const ip = await clientIp();
  const verdict = hit(`${which}:${ip}:${extraKey}`, rule.limit, rule.window);
  if (verdict.ok) return { ok: true };
  return {
    ok: false,
    message: `${rule.message} (about ${Math.ceil(verdict.retryAfterSeconds / 60)} minute${verdict.retryAfterSeconds > 90 ? "s" : ""})`,
  };
}

export const keyFor = async (which: keyof typeof LIMITS, extra = "") =>
  `${which}:${await clientIp()}:${extra}`;
