/**
 * Shared types for the visualizer Worker.
 *
 * Phase 1 covers entry point A (exterior restyle) only. The types below already
 * carry the shape the later phases need — room types for entry point B, plan
 * data for entry point C — so adding them does not mean reworking the cache key
 * or the log schema.
 */

export type EntryPoint = 'exterior' | 'interior' | 'plan';

export type RoomType =
  | 'living'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'puja';

/** Identifies the request that produced an image, and keys the cache. */
export interface GenerationRequest {
  entryPoint: EntryPoint;
  stylePackId: string;
  /** Set for entry point B/C. Absent for exterior restyle. */
  roomType?: RoomType;
  /**
   * A house from the company catalogue, when the visitor picked one rather than
   * uploading. Catalogue combinations are pre-generated, so these always hit
   * cache and never cost a Neuron.
   */
  houseTypeId?: string;
  /**
   * Content hash of an uploaded photo. Present only for custom uploads, and it
   * is what makes re-uploading the same house cache-hit instead of re-billing.
   */
  imageHash?: string;
}

export type GenerationVariant = 'day' | 'night';

export interface GeneratedImage {
  /** Public URL served from R2 through the Worker. */
  url: string;
  /** R2 object key. */
  key: string;
  variant: GenerationVariant;
  width: number;
  height: number;
}

export interface GenerationResult {
  images: GeneratedImage[];
  stylePackId: string;
  cached: boolean;
  /** Milliseconds spent end to end. */
  latencyMs: number;
  /** Estimated Neurons spent. Zero on a cache hit. */
  neurons: number;
}

/** What every generation writes to the log, per SPEC §5.6. */
export interface GenerationLogEntry {
  at: string;
  entryPoint: EntryPoint;
  stylePackId: string;
  roomType?: RoomType;
  cacheHit: boolean;
  neurons: number;
  latencyMs: number;
  provider: string;
  ok: boolean;
  error?: string;
}

/** Why a request was refused, so the UI can say something useful. */
export type RefusalReason =
  | 'rate_limited'
  | 'capacity'
  | 'not_a_building'
  | 'bad_upload'
  | 'unknown_style'
  | 'sign_in_required';

export class RefusalError extends Error {
  // Written out longhand rather than as constructor parameter properties, so
  // this module runs under `node --experimental-strip-types` and the guardrails
  // can be unit tested without a build step.
  readonly reason: RefusalReason;
  readonly userMessageEn: string;
  readonly userMessageNe: string;
  readonly status: number;

  constructor(
    reason: RefusalReason,
    userMessageEn: string,
    userMessageNe: string,
    status = 400,
  ) {
    super(`${reason}: ${userMessageEn}`);
    this.name = 'RefusalError';
    this.reason = reason;
    this.userMessageEn = userMessageEn;
    this.userMessageNe = userMessageNe;
    this.status = status;
  }
}
