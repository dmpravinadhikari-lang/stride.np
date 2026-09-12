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
export const VOICEOVER_READY = false;

export const VO_LINES: Line[] = [
  { id: "01-hook", at: 6, text: "Happy Panda Education's new website is live." },
  { id: "02-ask", at: 80, text: "Which country? What are my odds? What will it cost?" },
  { id: "03-home", at: 156, text: "Five countries, with the real approval rates." },
  { id: "04-rates", at: 198, text: "UK, ninety-six percent. Australia, twenty-five." },
  { id: "05-straight", at: 243, text: "Even the bad news, told straight." },
  { id: "06-cv", at: 288, text: "A free CV maker." },
  { id: "07-loan", at: 333, text: "Know the loan before you sign it." },
  { id: "08-process", at: 378, text: "Seven steps. Always know which one you're on." },
  { id: "09-fees", at: 423, text: "And every fee, published." },
  { id: "10-turn", at: 465, text: "All of it, in one place." },
  { id: "11-close", at: 525, text: "happypandaeducation dot com. Link in bio." },
];
