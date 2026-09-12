/**
 * Happy Panda Education Consultancy — the palette and the words.
 *
 * Read off www.happypandaeducation.com itself rather than guessed at: the
 * navy the whole site is set in, the cyan its every action button uses, the
 * green it marks good odds with. The bamboo is the one colour that comes from
 * the character artwork instead of the site.
 */
export const HP = {
  ink: "#0C1433", // the site's navy — text, dark cards, and the phone bezel
  deep: "#080F28", // top of the ground gradient, a shade under the navy
  brand: "#102A50", // middle of the gradient, and navy type on a white chip
  scarf: "#17456E", // foot of the gradient
  bright: "#36D2FF", // the cyan every button on the site is painted in
  good: "#0E9E79", // the green it marks approved with
  teal: "#05617F", // its small caps labels
  wash: "#EAF6FD",
  bamboo: "#7BAF55", // the sprig behind the panda's ear, from the artwork
  white: "#FFFFFF",
} as const;

export const rgba = {
  white: (a: number) => `rgba(255, 255, 255, ${a})`,
  ink: (a: number) => `rgba(12, 20, 51, ${a})`,
  bright: (a: number) => `rgba(54, 210, 255, ${a})`,
  bamboo: (a: number) => `rgba(123, 175, 85, ${a})`,
} as const;

/** Where the reel sends people: their own domain. */
export const SITE = "www.happypandaeducation.com";

/**
 * A soundtrack, if there is one.
 *
 * Remotion muxes whatever is named here into the render. Drop a file into
 * `public/happypanda/` and put its path here — `"happypanda/track.mp3"` — and
 * the reel comes out with sound. Left null, it renders silent, which is what
 * Instagram wants if the music is going to come from their own library.
 */
export const AUDIO: string | null = null;

/** The panda artwork and the logo, in public/happypanda/. */
export const ART = {
  ticket: "happypanda/panda-ticket.png",
  namaste: "happypanda/panda-namaste.png",
  thinking: "happypanda/panda-thinking.png",
  logo: "happypanda/logo.png",
} as const;

/**
 * Instagram lays its own furniture over a reel: the account row and caption
 * along the bottom, the action buttons up the right side. Nothing that has to
 * be read goes outside this box.
 */
export const SAFE = {
  top: 190,
  bottom: 400,
  side: 84,
} as const;
