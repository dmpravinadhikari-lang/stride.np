/**
 * Happy Panda Education Consultancy — the palette and the words.
 *
 * Read off their own material: the blue of the logo, the black and white of
 * the panda, the teal of the character's scarf, and the green of the bamboo
 * sprig behind its ear. Three of those are already in the artwork, so the
 * reel does not introduce a colour the brand does not own.
 */
export const HP = {
  ink: "#10222E", // panda black, cooled towards the blue
  deep: "#0E3A5C", // top of the ground gradient
  brand: "#1B5A8A", // the logo blue
  bright: "#3E8FC4",
  scarf: "#2E7D9A", // the character's scarf
  bamboo: "#7BAF55", // the sprig behind the ear
  cream: "#F6FAFD",
  white: "#FFFFFF",
} as const;

export const rgba = {
  white: (a: number) => `rgba(255, 255, 255, ${a})`,
  ink: (a: number) => `rgba(16, 34, 46, ${a})`,
  bamboo: (a: number) => `rgba(123, 175, 85, ${a})`,
} as const;

/**
 * Where the reel sends people. The platform gives every branch
 * <slug>.stride.np, so this is Happy Panda's address unless they have put a
 * domain of their own in front of it — one line to change if so.
 */
export const SITE = "happypanda.stride.np";

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
