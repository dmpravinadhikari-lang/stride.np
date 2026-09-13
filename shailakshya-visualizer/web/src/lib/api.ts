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
