/**
 * Cloudflare Workers AI.
 *
 * Two models, chosen by whether there is a source photo:
 *
 *   text-to-image   FLUX-1 Schnell — the better-looking model, and what the
 *                   catalogue pre-generation and the Phase 2 interiors use.
 *
 *   image-to-image  Stable Diffusion 1.5 img2img — used for entry point A.
 *                   FLUX Schnell on Workers AI is text-to-image only: it has no
 *                   image input, so it cannot preserve a real house's geometry.
 *                   Restyling a customer's own photo therefore has to run on
 *                   SD 1.5 img2img at low strength. It is a weaker model, which
 *                   is exactly why `strength` is kept low and the style prompt
 *                   does the heavy lifting.
 *
 * If Workers AI later ships a FLUX img2img or ControlNet endpoint, changing
 * IMG2IMG_MODEL below is the whole migration.
 */
import type { Env } from '../lib/env.ts';
import type { GenerateOptions, GenerateOutput, ImageProvider } from './index.ts';

const TEXT_TO_IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const IMG2IMG_MODEL = '@cf/runwayml/stable-diffusion-v1-5-img2img';

/**
 * Neuron estimates, used by the circuit breaker to decide when to stop.
 *
 * These are deliberate over-estimates. The breaker's job is to never exceed the
 * free tier, and over-estimating fails safe (it stops early) while
 * under-estimating fails expensive. Tune them against the real figures in the
 * Cloudflare dashboard after the first day of traffic — see docs/DEPLOY.md.
 */
const NEURONS_TEXT_TO_IMAGE = 60;
const NEURONS_IMG2IMG = 90;

/** FLUX Schnell is distilled for very few steps; more is wasted spend. */
const FLUX_STEPS = 4;

export function workersAiProvider(env: Env): ImageProvider {
  return {
    name: 'workers-ai',

    async generateImage(options: GenerateOptions): Promise<GenerateOutput> {
      return options.initImage
        ? imageToImage(env, options)
        : textToImage(env, options);
    },
  };
}

async function textToImage(
  env: Env,
  options: GenerateOptions,
): Promise<GenerateOutput> {
  // FLUX Schnell returns { image: <base64 jpeg> } rather than raw bytes.
  const response = (await env.AI.run(TEXT_TO_IMAGE_MODEL as never, {
    prompt: options.prompt,
    steps: FLUX_STEPS,
    ...(options.seed !== undefined ? { seed: options.seed } : {}),
  } as never)) as unknown as { image?: string };

  if (!response?.image) {
    throw new Error('workers-ai: text-to-image returned no image');
  }

  return {
    bytes: base64ToBytes(response.image),
    contentType: 'image/jpeg',
    neurons: NEURONS_TEXT_TO_IMAGE,
  };
}

async function imageToImage(
  env: Env,
  options: GenerateOptions,
): Promise<GenerateOutput> {
  const initImage = options.initImage;
  if (!initImage) throw new Error('workers-ai: img2img called without an image');

  // SD 1.5 img2img streams raw PNG bytes back rather than JSON.
  const stream = (await env.AI.run(IMG2IMG_MODEL as never, {
    prompt: options.prompt,
    negative_prompt: options.negativePrompt,
    image: [...initImage],
    // Low by default: entry point A must return the visitor's house restyled,
    // not a different house in the right style.
    strength: options.strength ?? 0.45,
    num_steps: 20,
    ...(options.width ? { width: options.width } : {}),
    ...(options.height ? { height: options.height } : {}),
  } as never)) as unknown as ReadableStream;

  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error('workers-ai: img2img returned no bytes');
  }

  return { bytes, contentType: 'image/png', neurons: NEURONS_IMG2IMG };
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
