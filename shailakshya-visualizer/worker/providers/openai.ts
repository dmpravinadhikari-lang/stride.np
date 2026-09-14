/**
 * OpenAI image generation.
 *
 * Added for the exterior views, where quality is what sells: this is the
 * picture the customer shows their family. It slots behind the same
 * generateImage() seam as everything else, which is what that abstraction was
 * for — no route, cache or UI code changes.
 *
 * ===========================================================================
 * THIS PROVIDER COSTS REAL MONEY. Everything else in this system runs inside
 * Cloudflare's free tier, which SPEC §4 called a hard constraint. OpenAI bills
 * per image, so with this enabled the circuit breaker stops being a safety net
 * and becomes the only thing between the company and a monthly invoice.
 * ===========================================================================
 *
 * Two consequences, both handled below:
 *
 *  - Spend is metered from the token usage OpenAI reports on every response,
 *    not from a guessed per-image price. The price per million tokens is a
 *    configurable var because it changes and because it differs per model —
 *    read it off the current pricing page and set it. Getting it wrong in the
 *    cheap direction is how the breaker fails to stop in time.
 *  - The budget counter's unit becomes micro-dollars (µUSD, a millionth of a
 *    dollar) rather than Cloudflare Neurons. 1,000,000 units = US$1. See
 *    docs/DEPLOY.md; the unit is per-provider and the breaker is unit-agnostic.
 */
import type { Env } from '../lib/env.ts';
import type { GenerateOptions, GenerateOutput, ImageProvider } from './index.ts';

const ENDPOINT_GENERATE = 'https://api.openai.com/v1/images/generations';
const ENDPOINT_EDIT = 'https://api.openai.com/v1/images/edits';

/** Deliberately high, so an unconfigured deployment over-counts and stops early. */
const DEFAULT_USD_PER_MTOK_OUTPUT = 40;
const DEFAULT_USD_PER_MTOK_INPUT = 5;

interface ImageResponse {
  data?: Array<{ b64_json?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: { message?: string; type?: string };
}

export function openAiProvider(env: Env): ImageProvider {
  return {
    name: 'openai',

    async generateImage(options: GenerateOptions): Promise<GenerateOutput> {
      const key = env.OPENAI_API_KEY;
      if (!key) throw new Error('openai: OPENAI_API_KEY is not set');

      const model = env.OPENAI_MODEL || 'gpt-image-1-mini';
      const quality = env.OPENAI_QUALITY || 'medium';
      const size = pickSize(options.width, options.height);

      const response = options.initImage
        ? await edit(key, model, quality, size, options)
        : await generate(key, model, quality, size, options);

      const body = (await response.json()) as ImageResponse;

      if (!response.ok || body.error) {
        // Surfaced to the caller, which logs it and shows the visitor a generic
        // message — an upstream error string must not reach the browser.
        throw new Error(
          `openai: ${response.status} ${body.error?.type ?? ''} ${body.error?.message ?? ''}`.trim(),
        );
      }

      const b64 = body.data?.[0]?.b64_json;
      if (!b64) throw new Error('openai: response contained no image');

      return {
        bytes: base64ToBytes(b64),
        contentType: 'image/png',
        neurons: costMicroUsd(env, body.usage),
      };
    },
  };
}

async function generate(
  key: string,
  model: string,
  quality: string,
  size: string,
  options: GenerateOptions,
): Promise<Response> {
  return fetch(ENDPOINT_GENERATE, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      // These models have no negative-prompt parameter, so the exclusions are
      // folded into the prompt as an instruction instead.
      prompt: withExclusions(options.prompt, options.negativePrompt),
      size,
      quality,
      n: 1,
    }),
  });
}

/** Geometry-preserving restyle, when a source photo is supplied. */
async function edit(
  key: string,
  model: string,
  quality: string,
  size: string,
  options: GenerateOptions,
): Promise<Response> {
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', withExclusions(options.prompt, options.negativePrompt));
  form.append('size', size);
  form.append('quality', quality);
  form.append('n', '1');
  // Copied into a fresh buffer: the Blob constructor's typing in workerd does
  // not accept a Uint8Array view directly.
  const bytes = new Uint8Array(options.initImage ?? []);
  form.append('image', new Blob([bytes.buffer], { type: 'image/png' }), 'source.png');

  return fetch(ENDPOINT_EDIT, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}` },
    body: form,
  });
}

function withExclusions(prompt: string, negative?: string): string {
  if (!negative) return prompt;
  return `${prompt}.\n\nDo not include any of the following: ${negative}.`;
}

/** OpenAI offers fixed sizes; pick the nearest to the requested proportion. */
function pickSize(width?: number, height?: number): string {
  if (!width || !height) return '1536x1024';
  if (width > height * 1.1) return '1536x1024';
  if (height > width * 1.1) return '1024x1536';
  return '1024x1024';
}

/**
 * Cost in micro-dollars, from the usage the API actually reported.
 *
 * price is USD per million tokens, so tokens x price lands directly in µUSD.
 * When usage is missing the call still cost something, so it is charged at a
 * pessimistic flat rate rather than free — a provider that silently reports
 * nothing must not read as a free provider.
 */
function costMicroUsd(env: Env, usage: ImageResponse['usage']): number {
  const out = num(env.OPENAI_USD_PER_MTOK_OUTPUT, DEFAULT_USD_PER_MTOK_OUTPUT);
  const inp = num(env.OPENAI_USD_PER_MTOK_INPUT, DEFAULT_USD_PER_MTOK_INPUT);

  if (!usage) return 50_000; // US$0.05, assumed high on purpose.

  return Math.ceil((usage.output_tokens ?? 0) * out + (usage.input_tokens ?? 0) * inp);
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
