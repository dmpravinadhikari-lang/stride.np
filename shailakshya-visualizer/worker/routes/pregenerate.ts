/**
 * Pre-generation endpoint — SPEC §5.2.
 *
 * Seeds the cache with every catalogue house × style pack combination, so most
 * visitors are served instantly at zero cost. Driven by scripts/pregenerate.mjs.
 *
 * Why an endpoint rather than a standalone Node script that calls the model
 * directly: the cache key, the prompt assembly and the R2 layout all have to
 * match the live path exactly, or every seeded entry misses and the company
 * pays twice for the same picture. Running inside the Worker means it is
 * literally the same code (lib/generate.ts) rather than a copy that has to be
 * kept in step.
 *
 * Access
 * ------
 * Guarded by the PREGENERATE_TOKEN secret. If that secret is not configured the
 * route 404s, so on a normal deploy this endpoint does not exist at all. It
 * also accepts only catalogue ids and known style packs — never a free-text
 * prompt — so a leaked token cannot be turned into a prompt oracle, only into
 * pictures of the company's own house types.
 */
import type { Env } from '../lib/env.ts';
import { budgetState, recordSpend } from '../lib/breaker.ts';
import { cacheKey, readCache } from '../lib/cache.ts';
import { runGeneration, seedFrom } from '../lib/generate.ts';
import { logGeneration } from '../lib/log.ts';
import { EXAMPLE_DATA, findHouseType, HOUSE_TYPES } from '../catalogue/houses.ts';
import {
  exteriorPrompt,
  findPack,
  interiorPrompt,
  STYLE_PACKS,
} from '../styles/packs.ts';
import type { GenerationRequest, RoomType } from '../lib/types.ts';

const ROOM_PROMPTS: Record<RoomType, string> = {
  living: 'a family living room with seating for six and a large window',
  bedroom: 'a main bedroom with a double bed and built-in wardrobe',
  kitchen: 'a kitchen with a counter, upper cabinets and a window over the sink',
  bathroom: 'a bathroom with a shower area, basin and a small high window',
  puja: 'a small puja room with a wooden shrine, brass lamps and a low seat',
};

export function pregenerateEnabled(env: Env): boolean {
  return Boolean(env.PREGENERATE_TOKEN);
}

/** Constant-time compare, so the token cannot be recovered by timing. */
function tokenMatches(supplied: string, expected: string): boolean {
  if (supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) {
    diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function authorised(request: Request, env: Env): boolean {
  const expected = env.PREGENERATE_TOKEN;
  if (!expected) return false;

  const header = request.headers.get('Authorization') ?? '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  return supplied.length > 0 && tokenMatches(supplied, expected);
}

/** The full matrix the script works through. */
export function plannedJobs() {
  const jobs: Array<{
    entryPoint: 'exterior' | 'interior';
    houseTypeId?: string;
    roomType?: RoomType;
    stylePackId: string;
    label: string;
  }> = [];

  for (const house of HOUSE_TYPES) {
    for (const pack of STYLE_PACKS) {
      jobs.push({
        entryPoint: 'exterior',
        houseTypeId: house.id,
        stylePackId: pack.id,
        label: `${house.nameEn} · ${pack.nameEn}`,
      });
    }
  }

  // Phase 2 interiors. Generated in the same pass because the marginal cost of
  // doing it now is far lower than a second batch run later.
  for (const roomType of Object.keys(ROOM_PROMPTS) as RoomType[]) {
    for (const pack of STYLE_PACKS) {
      jobs.push({
        entryPoint: 'interior',
        roomType,
        stylePackId: pack.id,
        label: `${roomType} · ${pack.nameEn}`,
      });
    }
  }

  return jobs;
}

/** GET — what the script needs to plan the run. Cheap, spends nothing. */
export async function pregeneratePlan(env: Env): Promise<Response> {
  const jobs = plannedJobs();
  const budget = await budgetState(env);

  // Report which combinations are already seeded, so a resumed run skips them.
  // Flagged per job against its own cache key rather than matched by display
  // label — labels are for humans and two of them could coincide.
  const marked = await Promise.all(
    jobs.map(async (job) => ({
      ...job,
      cached: Boolean(await readCache(env, await cacheKey(toRequest(job)))),
    })),
  );
  const alreadyCached = marked.filter((job) => job.cached).length;

  return json({
    exampleData: EXAMPLE_DATA,
    total: jobs.length,
    alreadyCached,
    remaining: jobs.length - alreadyCached,
    jobs: marked,
    budget: {
      spent: budget.spent,
      ceiling: budget.ceiling,
      remaining: budget.remaining,
      open: budget.open,
    },
  });
}

function toRequest(job: ReturnType<typeof plannedJobs>[number]): GenerationRequest {
  return {
    entryPoint: job.entryPoint,
    stylePackId: job.stylePackId,
    ...(job.roomType ? { roomType: job.roomType } : {}),
    ...(job.houseTypeId ? { houseTypeId: job.houseTypeId } : {}),
  };
}

/** POST — generate one combination. One job per request, so the script can
 *  pace itself and stop cleanly the moment the budget runs down. */
export async function pregenerateRun(request: Request, env: Env): Promise<Response> {
  if (EXAMPLE_DATA) {
    return json(
      {
        error: 'example_data',
        message:
          'worker/catalogue/houses.ts still holds example house types. Replace them with the real ones and set EXAMPLE_DATA to false before spending Neurons.',
      },
      409,
    );
  }

  const body = (await request.json().catch(() => null)) as {
    entryPoint?: string;
    houseTypeId?: string;
    roomType?: RoomType;
    stylePackId?: string;
  } | null;

  const pack = findPack(String(body?.stylePackId ?? ''));
  if (!pack) return json({ error: 'unknown_style' }, 400);

  const started = Date.now();
  let genRequest: GenerationRequest;
  let buildPrompt: (lighting: 'day' | 'night') => string;
  let seedSource: string;

  if (body?.entryPoint === 'exterior') {
    const house = findHouseType(String(body.houseTypeId ?? ''));
    if (!house) return json({ error: 'unknown_house_type' }, 400);

    genRequest = {
      entryPoint: 'exterior',
      stylePackId: pack.id,
      houseTypeId: house.id,
    };
    buildPrompt = (lighting) => exteriorPrompt(pack, lighting, house.subject);
    seedSource = `${house.id}:${pack.id}`;
  } else if (body?.entryPoint === 'interior') {
    const roomType = body.roomType;
    if (!roomType || !(roomType in ROOM_PROMPTS)) {
      return json({ error: 'unknown_room_type' }, 400);
    }

    genRequest = { entryPoint: 'interior', stylePackId: pack.id, roomType };
    buildPrompt = (lighting) =>
      interiorPrompt(pack, ROOM_PROMPTS[roomType], lighting);
    seedSource = `${roomType}:${pack.id}`;
  } else {
    return json({ error: 'unknown_entry_point' }, 400);
  }

  // Already seeded — free, and how a resumed run skips work.
  const key = await cacheKey(genRequest);
  if (await readCache(env, key)) {
    return json({ status: 'cached', neurons: 0, latencyMs: Date.now() - started });
  }

  // The batch run respects the same daily ceiling as visitors do. It is a big
  // job and it must not be the thing that exhausts the budget and locks real
  // visitors out for the rest of the day.
  const budget = await budgetState(env);
  if (!budget.open) {
    return json(
      {
        status: 'budget_exhausted',
        message: 'Daily Neuron ceiling reached. Resume tomorrow.',
        budget: { spent: budget.spent, ceiling: budget.ceiling },
      },
      503,
    );
  }

  try {
    const outcome = await runGeneration(env, {
      request: genRequest,
      buildPrompt,
      seed: seedFrom(seedSource),
    });

    await recordSpend(env, outcome.neurons);
    await logGeneration(env, {
      at: new Date().toISOString(),
      entryPoint: genRequest.entryPoint,
      stylePackId: pack.id,
      ...(genRequest.roomType ? { roomType: genRequest.roomType } : {}),
      cacheHit: false,
      neurons: outcome.neurons,
      latencyMs: Date.now() - started,
      provider: outcome.provider,
      ok: true,
    });

    return json({
      status: 'generated',
      neurons: outcome.neurons,
      latencyMs: Date.now() - started,
      images: outcome.images.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await logGeneration(env, {
      at: new Date().toISOString(),
      entryPoint: genRequest.entryPoint,
      stylePackId: pack.id,
      cacheHit: false,
      neurons: 0,
      latencyMs: Date.now() - started,
      provider: 'unknown',
      ok: false,
      error: message,
    });

    return json({ status: 'failed', error: message }, 500);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
