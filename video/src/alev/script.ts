/**
 * The narration for the Alev reel.
 *
 * English, because the restaurant's own site and menu are, and because the
 * Nepali line the reel already carries lands harder for being the only one.
 *
 * Frames are the cues `layout()` produces from the default timings: hook at 0,
 * a dish every 60 frames from 78, the table at 258, the spread at 354, the
 * occasion at 444, the card at 516.
 */
import type { Line } from "../components/VoiceLines";

export const VOICEOVER_READY = true;

export const VO_LINES: Line[] = [
  { id: "01-hook", at: 8, text: "Some dishes don't fit on a plate." },
  { id: "02-longest", at: 82, text: "Longest Kebab." },
  { id: "03-sultan", at: 142, text: "The Sultan's Grill." },
  { id: "04-platter", at: 202, text: "The Grilled Meat Platter." },
  { id: "05-table", at: 264, text: "Built for tables of four. Or fourteen." },
  { id: "06-spread", at: 360, text: "And everything before it." },
  { id: "07-occasion", at: 450, text: "Any excuse, really." },
  { id: "08-close", at: 522, text: "Alev Kebab Sultanate. Naxal." },
];
