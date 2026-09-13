/**
 * The Nepali narration: what is said, and the frame it starts on.
 *
 * Frames are the cut points in `ShilakshyaReel.tsx` — each line lands as its
 * screen does. Devanagari, because that is what a Nepali voice reads
 * naturally; the English words that stay English (Confusion, estimate, EMI)
 * are the ones nobody says any other way.
 *
 * `npm run voiceover shilakshya` generates the clips and flips READY.
 */
export type Line = { id: string; at: number; text: string };

export const VOICEOVER_READY = true;

export const VO_LINES: Line[] = [
  // Six lines, not one per screen. The screens change every 54 frames — 1.8
  // seconds — and nobody speaks a useful sentence in that, so the narration
  // runs a phase behind the pictures rather than chasing each cut.
  { id: "01-hook", at: 6, text: "घर त बनाउने, तर खर्च कति लाग्ला?" },
  { id: "02-cost", at: 110, text: "खर्च कति लाग्छ, आफैं अनुमान गर्नुहोस्।" },
  { id: "03-emi", at: 230, text: "अब बैंक लोनको EMI कति?" },
  { id: "04-more", at: 350, text: "हाम्रा सेवा र प्रोजेक्टहरू हेर्नुहोस्।" },
  { id: "05-turn", at: 466, text: "सबै कुरा, एकै ठाउँमा।" },
  { id: "06-close", at: 530, text: "शिलाक्ष्य — आजै हेर्नुहोस्।" },
];
