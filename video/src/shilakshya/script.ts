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

export const VOICEOVER_READY = false;

export const VO_LINES: Line[] = [
  { id: "01-hook", at: 6, text: "घर त बनाउने, तर खर्च कति लाग्ला?" },
  { id: "02-confusion", at: 58, text: "Confusion छ? यहाँ हेर्नुहोस्।" },
  { id: "03-cost", at: 148, text: "खर्च कति लाग्छ, आफैं अनुमान गर्नुहोस्।" },
  { id: "04-total", at: 202, text: "पूरा estimate, रुपैयाँमा।" },
  { id: "05-loan", at: 256, text: "खर्च थाहा भयो। अब बैंक लोनको EMI र ब्याज?" },
  { id: "06-emi", at: 310, text: "मासिक किस्ता कति आउँछ, तुरुन्तै थाहा।" },
  { id: "07-more", at: 364, text: "हाम्रा सेवा र प्रोजेक्टहरू पनि हेर्नुहोस्।" },
  { id: "08-turn", at: 466, text: "सबै कुरा, एकै ठाउँमा।" },
  { id: "09-close", at: 528, text: "शिलाक्ष्य डट कम डट एन पी। आजै हेर्नुहोस्।" },
];
