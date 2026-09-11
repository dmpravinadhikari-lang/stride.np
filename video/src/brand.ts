/**
 * The brand, mirrored from the app so the video cannot drift from it.
 *
 * Source of truth for the words is `src/lib/brand.ts`; for the colours it is
 * the `@theme` block in `src/app/globals.css`. Remotion is a separate npm
 * project with its own dependency tree, so it cannot import across the
 * boundary — the values are copied here, in one place, rather than inlined
 * into the scenes.
 */
export const BRAND = {
  name: "STRIDE",
  /** Capital S, as the logo sets it. The full stop is drawn, not typed. */
  wordmark: "Stride",
  domain: "stride.np",
  tagline: "Plan your study abroad, properly",
} as const;

/**
 * The three given colours sit at `ground`, `signature` and `wash`; the rest
 * are the darkened mixes of the same hue that the palette already defines,
 * so type has somewhere to live without leaving the family.
 */
export const C = {
  ground: "#001619", // brand-900, the deep teal-black everything is set on
  deepest: "#033C45", // brand-700
  deep: "#05545F", // brand-600, borders and panel edges on the dark ground
  primary: "#07717F", // brand-500
  mid: "#14A8BC", // brand-400
  signature: "#50E8F4", // brand-300, the signature cyan. A fill, never text on white.
  wash: "#C7F8FE", // brand-100, body copy on the dark ground
  white: "#FFFFFF",
} as const;

/** rgba() forms of the two light tones, for glows, hairlines and panel fills. */
export const rgba = {
  signature: (a: number) => `rgba(80, 232, 244, ${a})`,
  wash: (a: number) => `rgba(199, 248, 254, ${a})`,
  mid: (a: number) => `rgba(20, 168, 188, ${a})`,
  deep: (a: number) => `rgba(5, 84, 95, ${a})`,
} as const;

/** --radius-card, the one radius the product uses. */
export const RADIUS = 20;
