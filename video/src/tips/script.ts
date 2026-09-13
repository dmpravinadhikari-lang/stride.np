/**
 * The Nepali narration for the five-tips reel.
 *
 * Frames are the cues `layout()` produces from the default timings: the hook
 * at 0, a tip every 78 frames from 66, the close at 456. Re-time the reel in
 * the form and these want moving with it — the fit report from
 * `npm run voiceover -- tips` says by how much.
 *
 * Short lines on purpose. Each tip is up for two and a half seconds and the
 * sheet beside it is doing the explaining; the voice only has to name the
 * thing.
 */
import type { Line } from "../components/VoiceLines";

export const VOICEOVER_READY = true;

export const VO_LINES: Line[] = [
  { id: "01-hook", at: 6, text: "धेरैले छुटाउने पाँच कुरा।" },
  { id: "02-soil", at: 72, text: "जग अघि माटो जाँच।" },
  { id: "03-setback", at: 150, text: "Setback बाटोको केन्द्रबाट।" },
  { id: "04-cert", at: 228, text: "नक्सा पास मात्र पुग्दैन।" },
  { id: "05-boq", at: 306, text: "वर्गफिट होइन, BOQ।" },
  { id: "06-water", at: 384, text: "ढलानमा चौध दिन पानी।" },
  { id: "07-close", at: 462, text: "शिलाक्ष्य — आजै हेर्नुहोस्।" },
];
