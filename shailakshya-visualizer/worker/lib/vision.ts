/**
 * Building check — SPEC §10, "reject uploads that aren't buildings".
 *
 * This runs before generation, so it protects two things at once: the company
 * from generating something embarrassing out of a selfie, and the Neuron budget
 * from being spent on it. The vision model is far cheaper than the image model,
 * so paying for this check on every custom upload is worth it.
 */
import type { Env } from './env.ts';
import { settings } from './env.ts';
import { RefusalError } from './types.ts';

const VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

/** Vision calls are cheap but not free; charged against the same budget. */
export const NEURONS_VISION_CHECK = 8;

const QUESTION = [
  'Look at this photograph.',
  'Answer with exactly one word, lowercase, nothing else.',
  'Answer "building" if it shows a house, a building, or a building under construction.',
  'Answer "other" for anything else, including people, portraits, animals, food,',
  'documents, screenshots, interiors, and landscapes with no building in them.',
].join(' ');

export interface VisionVerdict {
  isBuilding: boolean;
  neurons: number;
  /** True when no check actually ran, so the caller can log honestly. */
  skipped: boolean;
}

export async function checkIsBuilding(
  env: Env,
  bytes: Uint8Array,
): Promise<VisionVerdict> {
  // The mock provider has no model behind it. Skipping is correct for local
  // development, but it must be visible in the logs so nobody assumes the
  // guardrail was exercised in a demo.
  if (settings(env).provider !== 'workers-ai') {
    console.log(
      JSON.stringify({ type: 'vision_check', skipped: true, reason: 'no model bound' }),
    );
    return { isBuilding: true, neurons: 0, skipped: true };
  }

  try {
    const response = (await env.AI.run(VISION_MODEL as never, {
      image: [...bytes],
      prompt: QUESTION,
      max_tokens: 8,
    } as never)) as unknown as { response?: string };

    const answer = (response?.response ?? '').toLowerCase();

    return {
      isBuilding: answer.includes('building'),
      neurons: NEURONS_VISION_CHECK,
      skipped: false,
    };
  } catch (err) {
    // Fail open. A vision outage should not take the whole product down, and
    // the downside of letting one odd photo through is far smaller than the
    // downside of rejecting every genuine customer for an hour.
    console.error('vision check failed, allowing upload', err);
    return { isBuilding: true, neurons: 0, skipped: true };
  }
}

export function rejectNonBuilding(): never {
  throw new RefusalError(
    'not_a_building',
    "That photo doesn't look like a house. Please upload a photo of a building.",
    'त्यो फोटो घरजस्तो देखिएन। कृपया घरको फोटो अपलोड गर्नुहोस्।',
  );
}
