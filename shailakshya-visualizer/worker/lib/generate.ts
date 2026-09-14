/**
 * The one place a generation is actually produced and cached.
 *
 * Both the live restyle route and the pre-generation endpoint go through here.
 * That is not tidiness — it is the correctness property the whole catalogue
 * depends on. If a batch script computed cache keys, prompts or R2 layout even
 * slightly differently from the live path, every pre-generated entry would miss
 * and the company would pay for the same images twice. Sharing the code makes
 * that divergence impossible rather than merely unlikely.
 */
import type { Env } from './env.ts';
import { cacheKey, writeCache, type CachedGeneration } from './cache.ts';
import { getProvider, type GenerationPurpose } from '../providers/index.ts';
import { NEGATIVE_PROMPT, type Lighting } from '../styles/packs.ts';
import type { GeneratedImage, GenerationRequest } from './types.ts';

export const OUTPUT_WIDTH = 1024;
export const OUTPUT_HEIGHT = 768;

/** SPEC §3: exteriors always come back as a day/night pair. */
export const LIGHTING_PAIR: Lighting[] = ['day', 'night'];

export interface GenerationPlan {
  /** Identity of the result. This alone determines the cache key. */
  request: GenerationRequest;
  /** Prompt for a given lighting condition. */
  buildPrompt: (lighting: Lighting) => string;
  /** Which lighting variants to produce. */
  lighting?: Lighting[];
  /** Source photo, for a geometry-preserving restyle. Absent = text-to-image. */
  initImage?: Uint8Array;
  strength?: number;
  /** Fixed seed keeps a given request reproducible across runs. */
  seed?: number;
  /** Selects the provider; exteriors may run on a different one. */
  purpose?: GenerationPurpose;
}

export interface GenerationOutcome {
  images: GeneratedImage[];
  neurons: number;
  provider: string;
  key: string;
}

/**
 * Generates every lighting variant, stores them in R2 and writes the cache
 * entry. Does NOT check the cache, charge the breaker or log — the callers do
 * that, because they gate differently: a visitor is rate limited, a batch run
 * is not.
 */
export async function runGeneration(
  env: Env,
  plan: GenerationPlan,
): Promise<GenerationOutcome> {
  const provider = getProvider(env, plan.purpose ?? 'interior');
  const key = await cacheKey(plan.request);
  const variants = plan.lighting ?? LIGHTING_PAIR;
  const images: GeneratedImage[] = [];
  let neurons = 0;

  for (const lighting of variants) {
    const output = await provider.generateImage({
      prompt: plan.buildPrompt(lighting),
      negativePrompt: NEGATIVE_PROMPT,
      initImage: plan.initImage,
      strength: plan.strength,
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      seed: plan.seed,
    });

    neurons += output.neurons;

    // Derived from the cache key, so the object is findable from the entry and
    // a re-run overwrites in place rather than orphaning the old image.
    const objectKey = `generated/${key.slice(4)}-${lighting}`;
    await env.IMAGES.put(objectKey, output.bytes as unknown as ArrayBuffer, {
      httpMetadata: {
        contentType: output.contentType,
        // Results are immutable, so they can be cached hard at the edge.
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        kind: 'generated',
        stylePackId: plan.request.stylePackId,
        ...(plan.request.houseTypeId ? { houseTypeId: plan.request.houseTypeId } : {}),
      },
    });

    images.push({
      url: `/api/image/${objectKey}`,
      key: objectKey,
      variant: lighting,
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
    });
  }

  const entry: CachedGeneration = {
    images,
    stylePackId: plan.request.stylePackId,
    createdAt: new Date().toISOString(),
    originalNeurons: neurons,
  };
  await writeCache(env, key, entry);

  return { images, neurons, provider: provider.name, key };
}

/** Stable seed from any string, so a rerun reproduces the same picture. */
export function seedFrom(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
