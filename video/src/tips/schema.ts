import { z } from "zod";
import { zColor } from "@remotion/zod-types";

/**
 * The five-tips reel, as a form.
 *
 * The tips themselves are the whole video, so they are an editable list: add a
 * sixth, drop one, reword any of them, and the reel gets longer or shorter to
 * match. `art` picks which technical sheet is drawn beside the words — the
 * five are the ones in `components/TipArt.tsx`.
 */
export const artNames = ["soil", "setback", "certificate", "boq", "water"] as const;

export const tipSchema = z.object({
  n: z.string().describe("The numeral on the chip — १, २, ३ …"),
  title: z.string(),
  line: z.string().describe("One line. If it needs two it is not sharp enough."),
  art: z.enum(artNames).describe("Which drawing to put beside it"),
  colour: zColor(),
});

export const tipsSchema = z.object({
  hookTop: z.string(),
  hookBig: z.string(),
  hookUnder: z.string(),
  tips: z.array(tipSchema),
  closeAsk: z.string(),
  closeSite: z.string(),
  closeButton: z.string(),
  timing: z.object({
    hook: z.number().min(1).max(8).describe("Seconds"),
    perTip: z.number().min(1).max(8),
    close: z.number().min(1).max(8),
  }),
});

export type TipsProps = z.infer<typeof tipsSchema>;
export type Tip = z.infer<typeof tipSchema>;
export type ArtName = (typeof artNames)[number];

/** Scenes cross-fade, so each starts a few frames before the last ends. */
const OVERLAP = 6;

export const layout = (timing: TipsProps["timing"], tips: number, fps: number) => {
  const f = (s: number) => Math.round(s * fps);
  const spans = [f(timing.hook), ...Array.from({ length: tips }, () => f(timing.perTip)), f(timing.close)];
  const cues: { from: number; duration: number }[] = [];
  let at = 0;
  for (const duration of spans) {
    cues.push({ from: at, duration });
    at += duration - OVERLAP;
  }
  return { cues, total: at + OVERLAP };
};
