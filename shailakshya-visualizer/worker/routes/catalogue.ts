/**
 * The catalogue: pre-generated house types, served straight from cache.
 *
 * These endpoints never generate. If a combination has not been pre-generated
 * they report that rather than falling through to the model, because the whole
 * point of the catalogue is that browsing is free. A visitor who wants
 * something not in the catalogue uploads a photo instead, which is the metered
 * path.
 *
 * The Phase 1 UI does not use these yet — the browse screen is Phase 2 work.
 */
import type { Env } from '../lib/env.ts';
import { cacheKey, readCache } from '../lib/cache.ts';
import { publicHouseTypes } from '../catalogue/houses.ts';
import { publicPacks } from '../styles/packs.ts';

export async function catalogueIndex(): Promise<Response> {
  return json({ houseTypes: publicHouseTypes(), packs: publicPacks() });
}

export async function catalogueResult(env: Env, url: URL): Promise<Response> {
  const houseTypeId = url.searchParams.get('houseTypeId');
  const stylePackId = url.searchParams.get('stylePackId');

  if (!houseTypeId || !stylePackId) {
    return json({ error: 'missing_parameters' }, 400);
  }

  const key = await cacheKey({ entryPoint: 'exterior', stylePackId, houseTypeId });
  const cached = await readCache(env, key);

  if (!cached) {
    return json({ error: 'not_generated' }, 404);
  }

  return json({
    images: cached.images,
    stylePackId: cached.stylePackId,
    cached: true,
    latencyMs: 0,
    neurons: 0,
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
