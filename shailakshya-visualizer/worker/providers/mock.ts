/**
 * Zero-cost local provider.
 *
 * Returns a deterministic placeholder so the entire flow — cache, breaker, rate
 * limiter, R2, the viewer — can be built, demoed and load-tested without a
 * Cloudflare account and without spending a single Neuron. This is what makes
 * "zero cost across 50 test generations" (SPEC §12) verifiable.
 *
 * The placeholder is drawn as a material sample card rather than a grey box: it
 * reads as intentional in the sample-board design, and it makes the day/night
 * pair and the style pack visible at a glance when reviewing the flow. It is
 * also unmistakably not a photograph, so a mock result can never be confused
 * for real output in a screenshot.
 */
import type { GenerateOptions, GenerateOutput, ImageProvider } from './index.ts';

export function mockProvider(): ImageProvider {
  return {
    name: 'mock',

    async generateImage(options: GenerateOptions): Promise<GenerateOutput> {
      const width = options.width ?? 1024;
      const height = options.height ?? 768;
      const seed = options.seed ?? hash(options.prompt);
      const night = /\bnight\b|dusk|evening/i.test(options.prompt);

      // A short, human-readable trace of what was asked for. Useful when
      // reviewing a grid of results.
      const label = firstClause(options.prompt);

      const svg = sampleCard({ width, height, seed, night, label });

      // A little latency so the loading state is exercised honestly rather than
      // completing instantly and hiding a jank the real provider would show.
      await new Promise((resolve) => setTimeout(resolve, 400));

      return {
        bytes: new TextEncoder().encode(svg),
        contentType: 'image/svg+xml',
        neurons: 0,
      };
    },
  };
}

interface CardOptions {
  width: number;
  height: number;
  seed: number;
  night: boolean;
  label: string;
}

function sampleCard({ width, height, seed, night, label }: CardOptions): string {
  const ground = night ? '#22262B' : '#F2EFE9';
  const ink = night ? '#F2EFE9' : '#22262B';
  const band = night ? '#2E343B' : '#C9C2B6';
  const sky = night ? '#171A1E' : '#DED8CC';

  // Deterministic massing blocks — same seed, same picture, every time.
  const rand = mulberry32(seed);
  const blocks = Array.from({ length: 5 }, (_, i) => {
    const w = Math.round((0.1 + rand() * 0.16) * width);
    const h = Math.round((0.22 + rand() * 0.4) * height);
    const x = Math.round((i / 5) * width + rand() * 40);
    const y = height - h - Math.round(height * 0.16);
    const tone = night ? 0.22 + rand() * 0.2 : 0.55 + rand() * 0.3;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${ink}" opacity="${tone.toFixed(2)}"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Placeholder visualization">
  <rect width="${width}" height="${height}" fill="${sky}"/>
  <rect y="${height * 0.62}" width="${width}" height="${height * 0.38}" fill="${ground}"/>
  ${blocks}
  <rect y="${height - 74}" width="${width}" height="74" fill="${band}"/>
  <text x="28" y="${height - 44}" font-family="system-ui,sans-serif" font-size="21" font-weight="600" fill="${ink}">${escapeXml(label)}</text>
  <text x="28" y="${height - 20}" font-family="system-ui,sans-serif" font-size="15" fill="${ink}" opacity="0.75">Visualization only — not a construction specification</text>
  <text x="${width - 28}" y="${height - 20}" text-anchor="end" font-family="system-ui,sans-serif" font-size="14" fill="${ink}" opacity="0.55">${night ? 'NIGHT' : 'DAY'} · PLACEHOLDER</text>
</svg>`;
}

function firstClause(prompt: string): string {
  const clause = prompt.split(/[,.]/)[0] ?? prompt;
  return clause.trim().slice(0, 64);
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c,
  );
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded PRNG — identical output for an identical prompt. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
