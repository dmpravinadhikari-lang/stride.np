import React from "react";
import { VoiceLines } from "../../components/VoiceLines";
import { VOICEOVER_READY, VO_LINES } from "../script";

/** The narration for this reel. See `components/VoiceLines` for the mechanism. */
export const Voiceover: React.FC = () => (
  <VoiceLines lines={VO_LINES} dir="shilakshya/vo" ready={VOICEOVER_READY} />
);
