/**
 * Shilakshya Griha Nirman — the palette and the words.
 *
 * Sampled off the logo and the running site rather than guessed: the navy the
 * mark is drawn in, the gold beside it, and the deep navy card the EMI result
 * is set on. Nothing here is a colour the company does not already own.
 */
export const SH = {
  navy: "#152A43", // the logo's navy, and the phone bezel
  deep: "#0C1A2B", // top of the ground gradient
  mid: "#16324E", // middle
  steel: "#1E4267", // foot
  gold: "#DFA340", // the logo's gold — the one accent
  goldLight: "#F2D9A0",
  concrete: "#E8E4DD",
  white: "#FFFFFF",
} as const;

export const rgba = {
  white: (a: number) => `rgba(255, 255, 255, ${a})`,
  navy: (a: number) => `rgba(21, 42, 67, ${a})`,
  gold: (a: number) => `rgba(223, 163, 64, ${a})`,
} as const;

/** Where the reel sends people. */
export const SITE = "shilakshya.com.np";

/** The wordmark, taken from the site. `logo.svg` is navy-on-white. */
export const ART = {
  logo: "shilakshya/logo.svg",
  logoWhite: "shilakshya/logo-white.svg",
} as const;

/** A soundtrack, if there is one. Null renders silent. */
export const AUDIO: string | null = null;

/** Clear of Instagram's caption bar and its buttons up the right. */
export const SAFE = {
  top: 190,
  bottom: 400,
  side: 84,
} as const;
