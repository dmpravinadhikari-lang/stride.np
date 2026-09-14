/**
 * POST /api/brief/parse
 *
 * Free text, an uploaded land photo, a survey map, or any combination, turned
 * into the structured brief the planner already takes. The customer then sees
 * what we understood and corrects it before anything is generated — which is
 * both better than guessing silently and cheaper, since the correction happens
 * before a single image is paid for.
 *
 * Cheap on purpose: one small text call, no image generation. It is metered
 * against the same daily ceiling so a scripted flood cannot run up a bill, but
 * the cost per call is a fraction of a generated image.
 */
import type { Env } from '../lib/env.ts';
import { budgetState, recordSpend } from '../lib/breaker.ts';
import { checkIpLimit, clientIp } from '../lib/ratelimit.ts';
import { prepareUpload } from '../lib/upload.ts';
import { parseBrief, parserAvailable } from '../brief/parse.ts';
import { requireSignIn } from './auth.ts';
import { RefusalError } from '../lib/types.ts';

/**
 * Flat charge for a parse, in the active provider's budget unit. A text call
 * with a low-detail image is far cheaper than a generated image; this is a
 * deliberate over-estimate so parsing can never quietly become the expensive
 * part.
 */
const PARSE_COST = 4_000;

export async function parseBriefRoute(request: Request, env: Env): Promise<Response> {
  if (!parserAvailable(env)) {
    throw new RefusalError(
      'unknown_style',
      'Describing your plan in words is not switched on yet. Please use the form instead.',
      'शब्दमा लेख्ने सुविधा अहिले चालू छैन। कृपया फारम प्रयोग गर्नुहोस्।',
      503,
    );
  }

  const form = await request.formData();
  const text = String(form.get('text') ?? '').trim();
  const files = form.getAll('image').filter((f): f is File => f instanceof File && f.size > 0);

  if (!text && files.length === 0) {
    throw new RefusalError(
      'bad_upload',
      'Tell us what you need, or add a photo of your land or your map.',
      'के चाहिन्छ लेख्नुहोस्, वा जग्गा वा नक्साको फोटो हाल्नुहोस्।',
    );
  }

  // Signed in first, when the company has that switched on: parsing costs
  // money and an open endpoint is one that can be scripted.
  await requireSignIn(request, env);

  // Same gates as any other metered call.
  const rate = await checkIpLimit(env, clientIp(request));
  if (!rate.allowed) {
    throw new RefusalError(
      'rate_limited',
      `You've used all ${rate.limit} designs for today. Please come back tomorrow.`,
      `आजका लागि ${rate.limit} वटै सकिए। भोलि फेरि आउनुहोस्।`,
      429,
    );
  }

  if (!(await budgetState(env)).open) {
    throw new RefusalError(
      'capacity',
      'We are at capacity today. Please use the form, which still works, or come back tomorrow.',
      'आजको क्षमता सकियो। फारम अझै चल्छ, वा भोलि आउनुहोस्।',
      503,
    );
  }

  // Runs the uploads through the same pipeline as any other photo: type
  // sniffed from the bytes, size capped, and EXIF stripped. A photo of
  // somebody's plot carries GPS pointing at the plot, and it is about to be
  // sent to a third-party API.
  const images: Array<{ bytes: Uint8Array; mime: string }> = [];
  for (const file of files) {
    const prepared = await prepareUpload(file);
    images.push({ bytes: prepared.bytes, mime: prepared.contentType });
  }

  const parsed = await parseBrief(env, text, images);
  await recordSpend(env, PARSE_COST);

  console.log(
    JSON.stringify({
      type: 'brief_parse',
      chars: text.length,
      images: images.length,
      missing: parsed.missing,
    }),
  );

  return json(parsed);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
