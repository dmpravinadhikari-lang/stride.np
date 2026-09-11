/**
 * The two families the product sets: Archivo for display, Poppins for body,
 * the same pairing as `--font-display` and `--font-sans` in the app.
 *
 * The latin subsets are committed under `public/fonts/` and loaded from
 * there rather than from the Google CDN, so a render is deterministic and
 * works with no network — a machine that cannot reach fonts.gstatic.com
 * would otherwise render the whole video in a fallback face without failing.
 */
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const DISPLAY_FAMILY = "Archivo";
const SANS_FAMILY = "Poppins";

/** Archivo ships as a variable font, so one file covers 600 and 700. */
void loadFont({
  family: DISPLAY_FAMILY,
  url: staticFile("fonts/Archivo-Variable-latin.woff2"),
  weight: "100 900",
  format: "woff2",
});
void loadFont({
  family: SANS_FAMILY,
  url: staticFile("fonts/Poppins-400-latin.woff2"),
  weight: "400",
  format: "woff2",
});
void loadFont({
  family: SANS_FAMILY,
  url: staticFile("fonts/Poppins-500-latin.woff2"),
  weight: "500",
  format: "woff2",
});

export const display = `${DISPLAY_FAMILY}, ui-sans-serif, system-ui, sans-serif`;
export const sans = `${SANS_FAMILY}, ui-sans-serif, system-ui, sans-serif`;
