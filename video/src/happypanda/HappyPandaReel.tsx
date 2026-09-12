import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { AUDIO, HP } from "./brand";
import { sans } from "../fonts";
import { Scene } from "../components/Scene";
import { Backdrop } from "./components/Backdrop";
import { Voiceover } from "./components/Voiceover";
import { Hook } from "./scenes/Hook";
import { Ask } from "./scenes/Ask";
import { Screens, SCREENS_DURATION } from "./scenes/Screens";
import { OnePlace } from "./scenes/OnePlace";
import { Close } from "./scenes/Close";

export const REEL_FPS = 30;

/**
 * Cut points. Scenes overlap by six frames and fade over four, which at this
 * pace reads as a hard cut with the edge taken off rather than a dissolve.
 */
const HOOK = { from: 0, duration: 80 };
const ASK = { from: 74, duration: 82 };
const SCREENS = { from: 150, duration: SCREENS_DURATION }; // 7 x 45 = 315
const ONE_PLACE = { from: SCREENS.from + SCREENS.duration - 6, duration: 66 };
const CLOSE = { from: ONE_PLACE.from + ONE_PLACE.duration - 6, duration: 81 };

export const REEL_DURATION = CLOSE.from + CLOSE.duration; // 600 frames, 20s

export const HappyPandaReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: HP.deep, fontFamily: sans }}>
    {/* Music, if a track is named in brand.ts; narration, if it has been
        generated. Both silent by default. */}
    {AUDIO ? <Audio src={staticFile(AUDIO)} volume={0.35} /> : null}
    <Voiceover />
    <Backdrop />
    <Scene {...HOOK} fadeIn={5} fadeOut={5}>
      <Hook />
    </Scene>
    <Scene {...ASK} fadeIn={5} fadeOut={5}>
      <Ask />
    </Scene>
    <Scene {...SCREENS} fadeIn={5} fadeOut={5}>
      <Screens />
    </Scene>
    <Scene {...ONE_PLACE} fadeIn={5} fadeOut={5}>
      <OnePlace />
    </Scene>
    <Scene {...CLOSE} fadeIn={5} fadeOut={0}>
      <Close />
    </Scene>
  </AbsoluteFill>
);
