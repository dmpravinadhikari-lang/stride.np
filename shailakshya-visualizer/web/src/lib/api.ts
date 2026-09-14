/**
 * Worker API client.
 *
 * The base URL is configurable because the widget is embedded on the company's
 * own site, which is a different origin from the Worker. Set it on the mount
 * element: <div data-shailakshya-visualizer data-api="https://...">.
 */

export interface StylePack {
  id: string;
  nameEn: string;
  nameNe: string;
  descriptionEn: string;
  descriptionNe: string;
  swatch: string;
}

export interface GeneratedImage {
  url: string;
  key: string;
  variant: 'day' | 'night';
  width: number;
  height: number;
}

export interface GenerationResult {
  images: GeneratedImage[];
  stylePackId: string;
  cached: boolean;
  latencyMs: number;
  neurons: number;
}

export interface Status {
  accepting: boolean;
  provider: string;
  capacityUsed: number;
}

export type LandUnit =
  | 'sqft' | 'sqm' | 'aana' | 'paisa' | 'daam'
  | 'ropani' | 'kattha' | 'dhur' | 'bigha';

export interface Brief {
  land: {
    area?: { value: number; unit: LandUnit };
    widthFt?: number;
    depthFt?: number;
    roadSide: 'north' | 'south' | 'east' | 'west';
  };
  requirements: {
    floors: number;
    bedrooms: number;
    attachedBathrooms: number;
    parkingCars: number;
    kitchen: boolean;
    living: boolean;
    dining: boolean;
    puja: boolean;
    store: boolean;
    stylePackId: string;
  };
}

export interface PlannedRoom {
  nameEn: string;
  nameNe: string;
  /** Position and size on the floor, in feet. */
  x: number;
  y: number;
  w: number;
  h: number;
  areaSqFt: number;
  tight: boolean;
}

export interface HousePlan {
  plot: { widthFt: number; depthFt: number; areaSqFt: number; areaLabel: string };
  buildable: { widthFt: number; depthFt: number; areaSqFt: number };
  floors: Array<{ level: number; nameEn: string; nameNe: string; rooms: PlannedRoom[]; areaSqFt: number }>;
  totals: { builtUpSqFt: number; groundCoveragePct: number; bedrooms: number; bathrooms: number };
  warnings: string[];
  fits: boolean;
}

export interface AuthState {
  configured: boolean;
  required: boolean;
  signedIn: boolean;
  clientId: string | null;
}

export interface ParsedBrief {
  land: Brief['land'];
  requirements: Brief['requirements'];
  /** One sentence describing what the parser believed it read. */
  understood: string;
  /** Field names it had to guess at, so the UI can flag them. */
  missing: string[];
}

export interface PlanResponse {
  plan: HousePlan;
  floors: Array<{ level: number; nameEn: string; nameNe: string; svg: string }>;
  briefId: string;
}

export interface VisualsResponse {
  visuals: Record<string, { images: GeneratedImage[]; cached: boolean }>;
  cached: boolean;
  neurons: number;
  latencyMs: number;
}

/** A refusal the UI is expected to show verbatim, in both languages. */
export class ApiError extends Error {
  constructor(
    readonly reason: string,
    readonly messageEn: string,
    readonly messageNe: string,
  ) {
    super(messageEn);
    this.name = 'ApiError';
  }
}

const GENERIC_EN = 'Something went wrong. Please try again.';
const GENERIC_NE = 'केही गडबड भयो। फेरि प्रयास गर्नुहोस्।';

export class Api {
  constructor(private readonly base: string) {}

  private url(path: string): string {
    return `${this.base.replace(/\/$/, '')}${path}`;
  }

  async styles(): Promise<StylePack[]> {
    const response = await fetch(this.url('/api/styles'));
    if (!response.ok) throw new ApiError('server_error', GENERIC_EN, GENERIC_NE);
    const body = (await response.json()) as { packs: StylePack[] };
    return body.packs;
  }

  async status(): Promise<Status> {
    const response = await fetch(this.url('/api/status'));
    if (!response.ok) throw new ApiError('server_error', GENERIC_EN, GENERIC_NE);
    return (await response.json()) as Status;
  }

  /** Whether to show the sign-in gate, and with which client id. */
  async authState(): Promise<AuthState> {
    const response = await fetch(this.url('/api/auth/state'), { credentials: 'include' });
    if (!response.ok) {
      // Treated as "not configured": a failing probe must not lock anyone out.
      return { configured: false, required: false, signedIn: false, clientId: null };
    }
    return (await response.json()) as AuthState;
  }

  /** Hands Google's credential to our Worker, which verifies it. */
  async signIn(credential: string, prompt?: string): Promise<void> {
    await this.post('/api/auth/google', { credential, prompt });
  }

  /**
   * Free text and/or photos of the land or the survey map, turned into a
   * structured brief. Multipart, because it carries images.
   */
  async parseBrief(text: string, files: File[]): Promise<ParsedBrief> {
    const form = new FormData();
    form.append('text', text);
    for (const file of files) form.append('image', file);

    const response = await fetch(this.url('/api/brief/parse'), {
      method: 'POST',
      credentials: 'include',
      body: form,
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as {
        error?: string; messageEn?: string; messageNe?: string;
      } | null;
      throw new ApiError(
        err?.error ?? 'server_error',
        err?.messageEn ?? GENERIC_EN,
        err?.messageNe ?? GENERIC_NE,
      );
    }

    return (await response.json()) as ParsedBrief;
  }

  /** Free and instant: no model runs, so this never fails on budget. */
  async plan(brief: Brief): Promise<PlanResponse> {
    return this.post<PlanResponse>('/api/plan', brief);
  }

  /** The metered half — this is where Neurons get spent. */
  async planVisuals(brief: Brief): Promise<VisualsResponse> {
    return this.post<VisualsResponse>('/api/plan/visual', brief);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(this.url(path), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // The session is a cookie, so it has to be sent cross-origin too.
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as {
        error?: string; messageEn?: string; messageNe?: string;
      } | null;
      throw new ApiError(
        err?.error ?? 'server_error',
        err?.messageEn ?? GENERIC_EN,
        err?.messageNe ?? GENERIC_NE,
      );
    }

    return (await response.json()) as T;
  }

  async restyle(photo: File, stylePackId: string): Promise<GenerationResult> {
    const form = new FormData();
    form.append('photo', photo);
    form.append('stylePackId', stylePackId);

    const response = await fetch(this.url('/api/restyle'), {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      // The Worker sends bilingual copy for every refusal it raises; only fall
      // back to the generic text if something upstream returned non-JSON.
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        messageEn?: string;
        messageNe?: string;
      } | null;

      throw new ApiError(
        body?.error ?? 'server_error',
        body?.messageEn ?? GENERIC_EN,
        body?.messageNe ?? GENERIC_NE,
      );
    }

    return (await response.json()) as GenerationResult;
  }
}
