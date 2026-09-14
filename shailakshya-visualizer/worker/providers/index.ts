/**
 * The single image-generation seam — SPEC §4.
 *
 * Everything upstream calls generateImage() and knows nothing about the model
 * behind it. Free tiers get withdrawn without notice, so swapping to Replicate
 * or a self-hosted ComfyUI endpoint means adding one file here and changing the
 * IMAGE_PROVIDER var. No route, no cache and no UI code should ever name a
 * model.
 */
import type { Env } from '../lib/env.ts';
import { settings } from '../lib/env.ts';
import { mockProvider } from './mock.ts';
import { openAiProvider } from './openai.ts';
import { workersAiProvider } from './workers-ai.ts';

export interface GenerateOptions {
  prompt: string;
  negativePrompt?: string;
  /**
   * Source photo for a geometry-preserving restyle. When present the provider
   * must run image-to-image; when absent, text-to-image.
   */
  initImage?: Uint8Array;
  /**
   * How far the restyle may depart from the source, 0..1. Low values keep the
   * building's geometry, which is the whole requirement for entry point A.
   */
  strength?: number;
  width?: number;
  height?: number;
  seed?: number;
}

export interface GenerateOutput {
  /** Encoded image bytes. */
  bytes: Uint8Array;
  contentType: string;
  /** Estimated Neurons consumed, for the circuit breaker. */
  neurons: number;
}

export interface ImageProvider {
  readonly name: string;
  generateImage(options: GenerateOptions): Promise<GenerateOutput>;
}

/**
 * `purpose` lets the exterior run on a different provider from the interiors.
 * The exterior is the picture that sells the job, so it is worth paying for;
 * five interior views at the same price each is where a bill comes from.
 */
export type GenerationPurpose = 'exterior' | 'interior';

export function getProvider(env: Env, purpose: GenerationPurpose = 'interior'): ImageProvider {
  const { provider, exteriorProvider } = settings(env);
  const chosen = purpose === 'exterior' && exteriorProvider ? exteriorProvider : provider;

  switch (chosen) {
    case 'workers-ai':
      return workersAiProvider(env);
    case 'openai':
      // Billed per image. See the warning at the top of openai.ts.
      return openAiProvider(env);
    case 'mock':
      return mockProvider();
    default:
      // An unrecognised value must not silently fall through to something that
      // costs money.
      console.warn(`unknown image provider "${chosen}", using mock`);
      return mockProvider();
  }
}
