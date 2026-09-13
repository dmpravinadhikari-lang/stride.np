/**
 * The voiceover: what is said, and the frame it starts on.
 *
 * Each line is pinned to the cut it belongs to — the frames here are the same
 * scene boundaries as `HappyPandaReel.tsx`, so a line lands as its picture
 * does rather than a beat after it.
 *
 * `scripts/voiceover.ts` reads this file, synthesises each line, writes it to
 * `public/happypanda/vo/<id>.mp3`, and flips READY. Until then the reel
 * renders silent and nothing below is used.
 */
export type Line = { id: string; at: number; text: string };

/** Flipped to true by the generator once every clip exists. */
export const VOICEOVER_READY = true;

export const VO_LINES: Line[] = [
  // Seven lines, not one per screen. The screens change every 45 frames — a
  // second and a half — so the narration covers them in pairs and threes
  // rather than trying to name each one as it passes.
  { id: "01-hook", at: 6, text: "Happy Panda's new website." },
  { id: "02-ask", at: 84, text: "Which country? What will it cost?" },
  { id: "03-rates", at: 160, text: "Five countries, with the real approval rates." },
  { id: "04-tools", at: 250, text: "A free CV maker. And your loan, costed." },
  { id: "05-process", at: 372, text: "Seven steps, and every fee published." },
  { id: "06-turn", at: 462, text: "All of it, in one place." },
  { id: "07-close", at: 528, text: "happypandaeducation dot com." },
];
