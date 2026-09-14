/**
 * Generation cache — SPEC §5.1, "cache first, always".
 *
 * Nothing in this Worker calls the model without going through here first. The
 * key is the request identity, so the catalogue combinations seeded by
 * scripts/pregenerate.ts are hit directly and cost nothing.
 */
import type { Env } from './env.ts';
import type { GenerationRequest, GeneratedImage } from './types.ts';

export interface CachedGeneration {
  images: GeneratedImage[];
  stylePackId: string;
  createdAt: string;
  /** Neurons the original generation cost. Kept for reporting, not re-charged. */
  originalNeurons: number;
}

/**
 * hash(entryPoint + roomType + stylePack + houseTypeId), plus the upload hash
 * for custom photos. Field order is fixed and the separator cannot appear in a
 * component, so two different requests cannot collide onto one key.
 */
export async function cacheKey(req: GenerationRequest): Promise<string> {
  const parts = [
    req.entryPoint,
    req.roomType ?? '-',
    req.stylePackId,
    req.houseTypeId ?? '-',
    req.imageHash ?? '-',
  ].join('|');

  return `gen:${await sha256Hex(parts)}`;
}

export async function sha256Hex(input: string | ArrayBuffer): Promise<string> {
  const data =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function readCache(
  env: Env,
  key: string,
): Promise<CachedGeneration | null> {
  return env.CACHE.get<CachedGeneration>(key, 'json');
}

/**
 * Cached entries do not expire. The images they point at live in R2, and a
 * catalogue result staying valid indefinitely is the entire point — an expiry
 * would silently start costing money again a month after launch.
 */
export async function writeCache(
  env: Env,
  key: string,
  value: CachedGeneration,
): Promise<void> {
  await env.CACHE.put(key, JSON.stringify(value));
}
