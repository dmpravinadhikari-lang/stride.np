import { z } from "zod";
import { soundSchema } from "../components/Soundtrack";
import { zColor, zTextarea } from "@remotion/zod-types";
import { ART } from "./brand";

/**
 * Everything in the Alev reel that a person might want to change, declared as
 * a schema so Remotion Studio draws a form for it.
 *
 * This is the point: nobody should have to open a .tsx file to fix a typo,
 * swap a photograph or give a scene another second. The Studio reads this
 * schema, renders text boxes, colour pickers and number fields down the right
 * hand side, previews every keystroke, and writes the result back into
 * `defaultProps` when you press Save.
 */

/** A photograph, named by its path under `public/`. */
const photo = (d: string) =>
  z.string().describe(`Path under public/ — e.g. ${d}`);

export const dishSchema = z.object({
  name: z.string(),
  say: z.string().describe("One line, from the menu"),
  photo: photo(ART.sultansGrill),
  shape: z
    .enum(["arch", "band"])
    .describe("arch for tall dishes, band for long ones"),
});

/** Seconds, not frames — the unit a person thinks in. */
export const timingSchema = z.object({
  hook: z.number().min(1).max(8),
  perDish: z.number().min(1).max(6),
  table: z.number().min(1).max(8),
  spread: z.number().min(1).max(8),
  occasion: z.number().min(1).max(8),
  close: z.number().min(1).max(8),
});

export const alevSchema = z.object({
  hookTop: z.string(),
  hookBottom: z.string(),
  hookPhoto: photo(ART.longestKebab),
  kicker: z.string(),

  dishes: z.array(dishSchema),

  tableTop: z.string(),
  tableBottom: z.string().describe("The half set in gold"),
  tablePhoto: photo(ART.tableNight),
  nepaliLine: z.string().describe("The one Nepali line"),

  spreadTitle: zTextarea(),
  spreadPhotos: z.array(photo(ART.mezze)).describe("Four, in a 2 × 2"),
  spreadKicker: z.string(),

  occasionPhoto: photo(ART.celebration),
  occasionWords: z.array(z.string()).describe("The last one is set in gold"),

  logo: photo(ART.logo),
  where: z.string(),
  hours: z.string(),
  phone: z.string(),
  site: z.string(),

  music: soundSchema,
  voice: soundSchema,
  gold: zColor(),
  ember: zColor(),
  timing: timingSchema,
});

export type AlevProps = z.infer<typeof alevSchema>;

/** Scenes cross-fade, so each one starts a few frames before the last ends. */
const OVERLAP = 6;

export type Cue = { from: number; duration: number };

/**
 * Turn the seconds a person typed into the frame ranges the reel runs on, and
 * the total the composition should be. Called both by the reel and by
 * `calculateMetadata`, so the timeline can never disagree with the video.
 */
export const layout = (
  timing: AlevProps["timing"],
  dishes: number,
  fps: number,
) => {
  const f = (s: number) => Math.round(s * fps);
  const spans = [
    f(timing.hook),
    ...Array.from({ length: dishes }, () => f(timing.perDish)),
    f(timing.table),
    f(timing.spread),
    f(timing.occasion),
    f(timing.close),
  ];

  const cues: Cue[] = [];
  let at = 0;
  for (const duration of spans) {
    cues.push({ from: at, duration });
    at += duration - OVERLAP;
  }

  const total = at + OVERLAP;
  return { cues, total };
};
