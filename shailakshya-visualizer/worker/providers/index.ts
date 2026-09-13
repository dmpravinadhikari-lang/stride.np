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

export function getProvider(env: Env): ImageProvider {
  const { provider } = settings(env);

  switch (provider) {
    case 'workers-ai':
      return workersAiProvider(env);
    case 'mock':
      return mockProvider();
    default:
      // An unrecognised value must not silently fall through to something that
      // costs money.
      console.warn(`unknown IMAGE_PROVIDER "${provider}", using mock`);
      return mockProvider();
  }
}
