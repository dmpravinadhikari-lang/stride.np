/**
 * Alev Kebab Sultanate — the palette, the facts, and the pictures.
 *
 * The red and the gold are sampled straight off their logo (#781818 and
 * #d8a848 by pixel count); the red is nudged to #7A1316, which is the exact
 * value their own site paints its buttons. The ground is the charcoal of the
 * grill rather than black, so the food sits on something warm.
 *
 * Every fact below is taken from alevkebab.com.np, and nothing is invented:
 * a reel that promises a dish or an hour the restaurant does not keep costs
 * them more than it earns.
 */
export const AL = {
  char: "#120D0C", // the ground
  charLift: "#1E1413", // panels a step off it
  ember: "#7A1316", // the logo's red
  emberDeep: "#43090B",
  gold: "#D8A848", // the logo's gold
  goldPale: "#F1DFB0",
  cream: "#F6F1E7",
} as const;

export const rgba = {
  cream: (a: number) => `rgba(246, 241, 231, ${a})`,
  gold: (a: number) => `rgba(216, 168, 72, ${a})`,
  char: (a: number) => `rgba(18, 13, 12, ${a})`,
} as const;

/** Straight off the site's header. */
export const PLACE = {
  name: "Alev Kebab Sultanate",
  where: "Tangalwood, Naxal",
  city: "Kathmandu",
  hours: "8 am – 10 pm, daily",
  phone: "01-4527343",
  site: "alevkebab.com.np",
} as const;

/** Their own photographs, resized for a 1080-wide render. */
export const ART = {
  logo: "alev/logo.png",
  longestKebab: "alev/longest-kebab.jpg",
  sultansGrill: "alev/sultans-grill.jpg",
  skewerTower: "alev/skewer-tower.jpg",
  chickenKebab: "alev/chicken-kebab.jpg",
  falafel: "alev/falafel.jpg",
  mezze: "alev/mezze.jpg",
  salad: "alev/salad.jpg",
  mixedGrill: "alev/mixed-grill.jpg",
  spread: "alev/spread.jpg",
  tableNight: "alev/table-night.jpg",
  tableLong: "alev/table-long.jpg",
  tableLights: "alev/table-lights.jpg",
  celebration: "alev/celebration.jpg",
  chef: "alev/chef.jpg",
} as const;

/** A soundtrack, if there is one. Null renders silent. */
export const AUDIO: string | null = null;

/** Clear of Instagram's caption bar and its buttons up the right. */
export const SAFE = { top: 190, bottom: 340, side: 84 } as const;
