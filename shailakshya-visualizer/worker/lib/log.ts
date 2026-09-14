/**
 * Generation logging — SPEC §5.6.
 *
 * Two audiences. Structured JSON on the console is for debugging and Logpush.
 * The KV counters are for the company: which style packs people actually pick
 * is the single most commercially useful thing this system learns, and it needs
 * to survive log retention.
 */
import { type Env, today } from './env.ts';
import type { GenerationLogEntry } from './types.ts';

const RECENT_LIMIT = 50;
const STAT_TTL_SECONDS = 60 * 60 * 24 * 120;

export async function logGeneration(
  env: Env,
  entry: GenerationLogEntry,
): Promise<void> {
  // Console first and unconditionally: if the KV writes below fail we still
  // want the record.
  console.log(JSON.stringify({ type: 'generation', ...entry }));

  try {
    await Promise.all([
      bumpCounter(env, `stat:style:${entry.stylePackId}:${today()}`),
      bumpCounter(env, `stat:${entry.cacheHit ? 'hit' : 'miss'}:${today()}`),
      pushRecent(env, entry),
    ]);
  } catch (err) {
    // Logging must never fail a generation the visitor already paid latency
    // for. Swallow, but say so.
    console.error('log write failed', err);
  }
}

async function bumpCounter(env: Env, key: string): Promise<void> {
  const current = Number(await env.METER.get(key)) || 0;
  await env.METER.put(key, String(current + 1), {
    expirationTtl: STAT_TTL_SECONDS,
  });
}

/** A short rolling window, enough to eyeball behaviour without a database. */
async function pushRecent(
  env: Env,
  entry: GenerationLogEntry,
): Promise<void> {
  const key = 'stat:recent';
  const list =
    (await env.METER.get<GenerationLogEntry[]>(key, 'json')) ?? [];
  list.unshift(entry);
  await env.METER.put(key, JSON.stringify(list.slice(0, RECENT_LIMIT)));
}
