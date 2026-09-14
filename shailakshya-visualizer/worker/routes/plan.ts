/**
 * The main flow: land + requirements in, a house design out.
 *
 * Two endpoints, deliberately split:
 *
 *   POST /api/plan         computes the layout and draws it. Free, instant, no
 *                          model involved. The customer sees their floor plans
 *                          immediately.
 *   POST /api/plan/visual  generates the exterior and interior pictures for a
 *                          plan already computed. This is the part that costs
 *                          Neurons, so it is a separate, explicit request.
 *
 * Splitting them matters. The plan is the useful part and it is free, so it
 * should never be held up behind a twenty second model call, and a visitor who
 * only wants to know "does four bedrooms fit on my three aana" costs nothing.
 */
import { settings, type Env } from '../lib/env.ts';
import { budgetState, recordSpend } from '../lib/breaker.ts';
import { cacheKey, readCache, sha256Hex } from '../lib/cache.ts';
import { runGeneration, seedFrom } from '../lib/generate.ts';
import { logGeneration } from '../lib/log.ts';
import { checkIpLimit, clientIp, consumeIpLimit } from '../lib/ratelimit.ts';
import { exteriorPrompt, findPack, interiorPrompt } from '../styles/packs.ts';
import { planHouse } from '../plan/layout.ts';
import { renderFloorSvg } from '../plan/render.ts';
import { STOREY_HEIGHT_FT } from '../plan/norms.ts';
import type { HousePlan, LandInput, RequirementInput } from '../plan/types.ts';
import { RefusalError, type RoomType } from '../lib/types.ts';

interface Brief {
  land: LandInput;
  requirements: RequirementInput;
}

/**
 * How many images to have in flight at once. Enough to keep the wall clock
 * near a single image, few enough not to trip an upstream rate limit.
 */
const CONCURRENCY = 4;

/**
 * Pessimistic cost of one job, in whatever unit the active provider meters in.
 * Only used to decide how much of a batch fits in the remaining budget before
 * any of it runs; actual spend is always recorded from what the provider
 * reports. Over-estimating here means generating fewer images than affordable,
 * which is the harmless direction.
 */
const ESTIMATED_COST_PER_JOB = 60_000;

/** Rooms worth picturing. A store or a stair is not. */
const VISUAL_ROOMS: Record<string, RoomType> = {
  living: 'living',
  master: 'bedroom',
  kitchen: 'kitchen',
  bathroom: 'bathroom',
  puja: 'puja',
};

export async function computePlan(request: Request, _env: Env): Promise<Response> {
  const brief = await readBrief(request);
  const plan = planHouse(brief.land, brief.requirements);

  return json({
    plan,
    // Drawn here rather than in the browser so the same plan renders identically
    // everywhere, including in whatever the salesperson later prints.
    floors: plan.floors.map((floor) => ({
      level: floor.level,
      nameEn: floor.nameEn,
      nameNe: floor.nameNe,
      svg: renderFloorSvg(plan, floor, { width: 900 }),
    })),
    briefId: await briefId(brief),
  });
}

/**
 * Generates the pictures for a computed plan. The plan shapes the prompt; it
 * never constrains the pixels (SPEC §7).
 */
export async function planVisuals(request: Request, env: Env): Promise<Response> {
  const started = Date.now();
  const brief = await readBrief(request);

  const pack = findPack(brief.requirements.stylePackId);
  if (!pack) {
    throw new RefusalError(
      'unknown_style',
      'That style is no longer available. Please pick another.',
      'त्यो शैली अहिले उपलब्ध छैन। अर्को छान्नुहोस्।',
    );
  }

  const plan = planHouse(brief.land, brief.requirements);
  if (plan.floors.length === 0) {
    throw new RefusalError(
      'bad_upload',
      'There is no buildable area on this plot, so there is nothing to draw yet.',
      'यो जग्गामा बनाउन मिल्ने ठाउँ छैन।',
    );
  }

  // The brief identifies the design, so two customers with the same land and
  // the same requirements share one cached result and cost one generation.
  const id = await briefId(brief);

  const wanted = wantedRooms(plan);
  const jobs: Array<{ key: string; roomType?: RoomType; prompt: (l: 'day' | 'night') => string }> = [
    {
      key: 'exterior',
      prompt: (lighting) => exteriorPrompt(pack, lighting, describeMassing(plan)),
    },
    ...wanted.map((room) => ({
      key: room.roomType,
      roomType: room.roomType,
      prompt: (lighting: 'day' | 'night') =>
        interiorPrompt(pack, room.description, lighting),
    })),
  ];

  // Everything already cached comes back free, before any gate below.
  const results: Record<string, unknown> = {};
  const outstanding: typeof jobs = [];

  for (const job of jobs) {
    const req = {
      entryPoint: 'plan' as const,
      stylePackId: pack.id,
      houseTypeId: id,
      ...(job.roomType ? { roomType: job.roomType } : {}),
    };
    const cached = await readCache(env, await cacheKey(req));
    if (cached) results[job.key] = { images: cached.images, cached: true };
    else outstanding.push(job);
  }

  if (outstanding.length === 0) {
    return json({ visuals: results, cached: true, neurons: 0, latencyMs: Date.now() - started });
  }

  const ip = clientIp(request);
  const rate = await checkIpLimit(env, ip);
  if (!rate.allowed) {
    throw new RefusalError(
      'rate_limited',
      `You've used all ${rate.limit} designs for today. Your floor plan is still yours — leave your number and we'll send the pictures tomorrow.`,
      `आजका लागि ${rate.limit} वटै डिजाइन सकिए। नक्सा तपाईंकै हो — नम्बर छोड्नुहोस्, भोलि तस्बिर पठाउँछौं।`,
      429,
    );
  }

  const budget = await budgetState(env);
  if (!budget.open) {
    throw new RefusalError(
      'capacity',
      "Pictures are at capacity today, but your floor plan is ready above. Leave your number and we'll send the visuals tomorrow.",
      'आजको क्षमता सकियो, तर तपाईंको नक्सा तयार छ। नम्बर छोड्नुहोस् — भोलि तस्बिर पठाउँछौं।',
      503,
    );
  }

  // A full set is the exterior pair plus a view of each main room. Run
  // sequentially that is two to three minutes in one HTTP request, which is
  // long enough to hit proxy timeouts and far too long to sit in front of. Run
  // with bounded concurrency instead: a few at a time keeps the wall clock near
  // that of the slowest single image without opening seven upstream requests at
  // once.
  //
  // The cost of parallelism is that spend cannot be re-checked between images,
  // so the whole batch is estimated against the remaining budget up front and
  // trimmed to what actually fits. That is stricter than the sequential version
  // was, not looser: it refuses before spending rather than after.
  const affordable = trimToBudget(env, outstanding, budget.remaining);

  if (affordable.length === 0) {
    throw new RefusalError(
      'capacity',
      "Pictures are at capacity today, but your floor plan is ready above. Leave your number and we'll send the visuals tomorrow.",
      'आजको क्षमता सकियो, तर तपाईंको नक्सा तयार छ। नम्बर छोड्नुहोस् — भोलि तस्बिर पठाउँछौं।',
      503,
    );
  }

  let neurons = 0;

  const run = async (job: (typeof outstanding)[number]) => {
    const req = {
      entryPoint: 'plan' as const,
      stylePackId: pack.id,
      houseTypeId: id,
      ...(job.roomType ? { roomType: job.roomType } : {}),
    };

    // Exteriors get the day/night pair; interiors only daylight, which keeps a
    // set that is already several images from doubling again.
    const outcome = await runGeneration(env, {
      request: req,
      buildPrompt: job.prompt,
      lighting: job.key === 'exterior' ? ['day', 'night'] : ['day'],
      purpose: job.key === 'exterior' ? 'exterior' : 'interior',
      seed: seedFrom(`${id}:${job.key}`),
    });

    neurons += outcome.neurons;
    results[job.key] = { images: outcome.images, cached: false };
  };

  // One failed room should not lose the whole set — and whatever did generate
  // has been paid for, so it must still be charged and returned.
  const failures = await inBatches(affordable, CONCURRENCY, run);

  await recordSpend(env, neurons);
  await consumeIpLimit(env, ip);

  await logGeneration(env, {
    at: new Date().toISOString(),
    entryPoint: 'plan',
    stylePackId: pack.id,
    cacheHit: false,
    neurons,
    latencyMs: Date.now() - started,
    provider: 'plan',
    ok: failures.length === 0,
    ...(failures.length > 0 ? { error: failures.join('; ') } : {}),
  });

  return json({
    visuals: results,
    cached: false,
    neurons,
    latencyMs: Date.now() - started,
    // Told plainly rather than silently returning a short set.
    incomplete: failures.length > 0 || affordable.length < outstanding.length,
  });
}

/**
 * Keeps only as much of the batch as the remaining budget covers, exterior
 * first — if only some of the set can be afforded, it should be the picture
 * that matters.
 */
function trimToBudget<T extends { key: string }>(
  env: Env,
  jobs: T[],
  remaining: number,
): T[] {
  // The mock provider never charges, so never trim against it.
  if (settings(env).provider === 'mock' && !settings(env).exteriorProvider) return jobs;

  const affordable = Math.floor(remaining / ESTIMATED_COST_PER_JOB);
  if (affordable >= jobs.length) return jobs;

  const ordered = [...jobs].sort((a, b) => (a.key === 'exterior' ? -1 : b.key === 'exterior' ? 1 : 0));
  return ordered.slice(0, Math.max(affordable, 0));
}

/** Runs jobs `size` at a time, collecting failures instead of aborting. */
async function inBatches<T>(
  items: T[],
  size: number,
  run: (item: T) => Promise<void>,
): Promise<string[]> {
  const failures: string[] = [];

  for (let i = 0; i < items.length; i += size) {
    const settled = await Promise.allSettled(items.slice(i, i + size).map(run));
    for (const outcome of settled) {
      if (outcome.status === 'rejected') {
        failures.push(
          outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
        );
      }
    }
  }

  return failures;
}

function wantedRooms(plan: HousePlan): Array<{ roomType: RoomType; description: string }> {
  const seen = new Set<RoomType>();
  const out: Array<{ roomType: RoomType; description: string }> = [];

  for (const floor of plan.floors) {
    for (const room of floor.rooms) {
      const roomType = VISUAL_ROOMS[room.kind];
      if (!roomType || seen.has(roomType)) continue;
      seen.add(roomType);
      out.push({
        roomType,
        // The computed size informs the description, which is exactly the role
        // SPEC §7 gives plan data: it shapes the words, not the pixels.
        description: `a ${room.nameEn.toLowerCase()} of about ${room.areaSqFt} square feet, roughly ${room.w.toFixed(0)} by ${room.h.toFixed(0)} feet`,
      });
    }
  }

  return out;
}

/** A sentence describing the massing, for the exterior prompt. */
function describeMassing(plan: HousePlan): string {
  const storeys = plan.floors.length;
  const frontage = Math.max(...plan.floors[0]!.rooms.map((r) => r.x + r.w));
  const height = Math.round(storeys * STOREY_HEIGHT_FT);
  const hasParking = plan.floors[0]!.rooms.some((r) => r.kind === 'parking');
  const hasTerrace = plan.floors.some((f) => f.rooms.some((r) => r.kind === 'terrace'));

  return [
    `a ${storeys} storey house about ${height} feet tall`,
    `with a frontage of about ${frontage.toFixed(0)} feet facing the road`,
    hasParking ? 'a covered car parking bay at ground level' : null,
    hasTerrace ? 'an open terrace on the upper floor' : null,
  ]
    .filter(Boolean)
    .join(', ');
}

async function readBrief(request: Request): Promise<Brief> {
  const body = (await request.json().catch(() => null)) as Brief | null;

  if (!body?.land || !body?.requirements) {
    throw new RefusalError(
      'bad_upload',
      'Please tell us about your land and what you need.',
      'कृपया जग्गा र आवश्यकताको विवरण दिनुहोस्।',
    );
  }

  return body;
}

/**
 * Stable id for a brief. Only the fields that change the design are included,
 * so a cosmetic difference does not force a second paid generation.
 */
async function briefId(brief: Brief): Promise<string> {
  const { land, requirements } = brief;
  const canonical = JSON.stringify([
    land.area?.value ?? 0,
    land.area?.unit ?? '',
    land.widthFt ?? 0,
    land.depthFt ?? 0,
    land.roadSide,
    land.setbacks ?? {},
    requirements.floors,
    requirements.bedrooms,
    requirements.attachedBathrooms,
    requirements.parkingCars,
    requirements.kitchen,
    requirements.living,
    requirements.dining,
    requirements.puja,
    requirements.store,
  ]);

  return (await sha256Hex(canonical)).slice(0, 32);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
