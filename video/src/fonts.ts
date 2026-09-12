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
/** The heavy weights the Happy Panda reel sets its headlines in. */
void loadFont({
  family: SANS_FAMILY,
  url: staticFile("fonts/Poppins-600-latin.woff2"),
  weight: "600",
  format: "woff2",
});
void loadFont({
  family: SANS_FAMILY,
  url: staticFile("fonts/Poppins-700-latin.woff2"),
  weight: "700",
  format: "woff2",
});
void loadFont({
  family: SANS_FAMILY,
  url: staticFile("fonts/Poppins-800-latin.woff2"),
  weight: "800",
  format: "woff2",
});

export const display = `${DISPLAY_FAMILY}, ui-sans-serif, system-ui, sans-serif`;
export const sans = `${SANS_FAMILY}, ui-sans-serif, system-ui, sans-serif`;

/**
 * Mukta, for the Shilakshya reel. It is drawn for Devanagari and carries a
 * Latin of the same weight and colour, so a line that mixes Nepali and English
 * — which is how people actually write and say this — sets in one face
 * instead of two that never quite line up.
 */
const NEPALI_FAMILY = "Mukta";

for (const weight of ["600", "700", "800"] as const) {
  // Two files per weight: the Devanagari subset is the large one, the Latin
  // a tenth of its size. Both are needed for a line like "Confusion छ?".
  void loadFont({
    family: NEPALI_FAMILY,
    url: staticFile(`fonts/Mukta-${weight}-devanagari.woff2`),
    weight,
    format: "woff2",
  });
  void loadFont({
    family: NEPALI_FAMILY,
    url: staticFile(`fonts/Mukta-${weight}-latin.woff2`),
    weight,
    format: "woff2",
  });
}

export const nepali = `${NEPALI_FAMILY}, ui-sans-serif, system-ui, sans-serif`;

/**
 * Jost, for the Alev Kebab Sultanate reel — the face their own website sets,
 * so the reel and the site speak in the same voice. Variable, so the one file
 * covers every weight the reel asks for.
 */
const GEOMETRIC_FAMILY = "Jost";

void loadFont({
  family: GEOMETRIC_FAMILY,
  url: staticFile("fonts/Jost-Variable-latin.woff2"),
  weight: "100 900",
  format: "woff2",
});

export const geometric = `${GEOMETRIC_FAMILY}, ui-sans-serif, system-ui, sans-serif`;
