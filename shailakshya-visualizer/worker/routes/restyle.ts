/**
 * Entry point A — restyle an exterior. SPEC §2A, §11 Phase 1.
 *
 * The order of operations in restyle() is the cost-control design, and it is
 * deliberate:
 *
 *   1. cache        — a hit costs nothing, so it is checked before every gate
 *                     below. A returning visitor is never rate limited and is
 *                     served even when the breaker has tripped.
 *   2. rate limit    — checked, not consumed, so a later refusal cannot burn
 *                     the visitor's daily quota.
 *   3. circuit breaker
 *   4. vision check  — cheap, and rejects before the expensive call.
 *   5. generate      — the only step that spends real money.
 *
 * Moving the cache check below any of the gates would break SPEC §5.1.
 *
 * The generation itself lives in lib/generate.ts, shared with the
 * pre-generation endpoint so the two cannot drift apart on cache keys.
 */
import type { Env } from '../lib/env.ts';
import { budgetState, recordSpend } from '../lib/breaker.ts';
import { cacheKey, readCache } from '../lib/cache.ts';
import { runGeneration, seedFrom } from '../lib/generate.ts';
import { logGeneration } from '../lib/log.ts';
import { checkIpLimit, clientIp, consumeIpLimit } from '../lib/ratelimit.ts';
import { prepareUpload, storeUpload } from '../lib/upload.ts';
import { checkIsBuilding, rejectNonBuilding } from '../lib/vision.ts';
import { exteriorPrompt, findPack } from '../styles/packs.ts';
import {
  RefusalError,
  type GenerationRequest,
  type GenerationResult,
} from '../lib/types.ts';

/**
 * How far the restyle may depart from the source photo. Low on purpose: SPEC
 * §2A requires the visitor's own building back, not a different house in the
 * right style.
 */
const RESTYLE_STRENGTH = 0.45;

export async function restyle(request: Request, env: Env): Promise<Response> {
  const started = Date.now();

  const form = await request.formData();
  const stylePackId = String(form.get('stylePackId') ?? '');
  const file = form.get('photo');

  const pack = findPack(stylePackId);
  if (!pack) {
    throw new RefusalError(
      'unknown_style',
      'That style is no longer available. Please pick another.',
      'त्यो शैली अहिले उपलब्ध छैन। अर्को छान्नुहोस्।',
    );
  }

  if (!(file instanceof File)) {
    throw new RefusalError(
      'bad_upload',
      'Please choose a photo of the house.',
      'कृपया घरको फोटो छान्नुहोस्।',
    );
  }

  const upload = await prepareUpload(file);

  const genRequest: GenerationRequest = {
    entryPoint: 'exterior',
    stylePackId: pack.id,
    imageHash: upload.hash,
  };
  const key = await cacheKey(genRequest);

  // 1. Cache first, always.
  const cached = await readCache(env, key);
  if (cached) {
    const result: GenerationResult = {
      images: cached.images,
      stylePackId: pack.id,
      cached: true,
      latencyMs: Date.now() - started,
      neurons: 0,
    };

    await logGeneration(env, {
      at: new Date().toISOString(),
      entryPoint: 'exterior',
      stylePackId: pack.id,
      cacheHit: true,
      neurons: 0,
      latencyMs: result.latencyMs,
      provider: 'cache',
      ok: true,
    });

    return json(result);
  }

  const ip = clientIp(request);

  // 2. Rate limit.
  const rate = await checkIpLimit(env, ip);
  if (!rate.allowed) {
    throw new RefusalError(
      'rate_limited',
      `You've used all ${rate.limit} custom designs for today. Browse saved designs, or leave your number and we'll send yours tomorrow.`,
      `आजका लागि ${rate.limit} वटै डिजाइन प्रयोग भइसके। सुरक्षित डिजाइन हेर्नुहोस्, वा नम्बर छोड्नुहोस् — भोलि पठाउँछौं।`,
      429,
    );
  }

  // 3. Circuit breaker.
  const budget = await budgetState(env);
  if (!budget.open) {
    throw new RefusalError(
      'capacity',
      "Custom designs are at capacity today. Browse saved designs, or leave your number and we'll send yours tomorrow.",
      'आजको क्षमता सकियो। सुरक्षित डिजाइन हेर्नुहोस्, वा नम्बर छोड्नुहोस् — भोलि पठाउँछौं।',
      503,
    );
  }

  // 4. Cheap guardrail before the expensive call.
  const verdict = await checkIsBuilding(env, upload.bytes);
  let neurons = verdict.neurons;
  if (!verdict.isBuilding) {
    await recordSpend(env, neurons);
    rejectNonBuilding();
  }

  // 5. Generate.
  let providerName = 'unknown';

  try {
    const outcome = await runGeneration(env, {
      request: genRequest,
      buildPrompt: (lighting) => exteriorPrompt(pack, lighting),
      initImage: upload.bytes,
      strength: RESTYLE_STRENGTH,
      seed: seedFrom(upload.hash),
    });

    neurons += outcome.neurons;
    providerName = outcome.provider;

    await storeUpload(env, upload);

    // Charged only once the work actually succeeded.
    await recordSpend(env, neurons);
    await consumeIpLimit(env, ip);

    const result: GenerationResult = {
      images: outcome.images,
      stylePackId: pack.id,
      cached: false,
      latencyMs: Date.now() - started,
      neurons,
    };

    await logGeneration(env, {
      at: new Date().toISOString(),
      entryPoint: 'exterior',
      stylePackId: pack.id,
      cacheHit: false,
      neurons,
      latencyMs: result.latencyMs,
      provider: providerName,
      ok: true,
    });

    return json(result);
  } catch (err) {
    // A partial generation still consumed Neurons upstream; record them or the
    // breaker will drift under the true spend.
    await recordSpend(env, neurons);

    await logGeneration(env, {
      at: new Date().toISOString(),
      entryPoint: 'exterior',
      stylePackId: pack.id,
      cacheHit: false,
      neurons,
      latencyMs: Date.now() - started,
      provider: providerName,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });

    throw err;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
