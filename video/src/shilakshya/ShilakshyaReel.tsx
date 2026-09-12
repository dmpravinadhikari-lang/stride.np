import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { AUDIO, SH } from "./brand";
import { nepali } from "../fonts";
import { Scene } from "../components/Scene";
import { Backdrop } from "./components/Backdrop";
import { Voiceover } from "./components/Voiceover";
import { Hook } from "./scenes/Hook";
import { Screens, SCREENS_DURATION } from "./scenes/Screens";
import { Turn } from "./scenes/Turn";
import { Close } from "./scenes/Close";

export const REEL_FPS = 30;

/** Scenes overlap by six frames and fade over five — a cut with the edge off. */
const HOOK = { from: 0, duration: 96 };
const SCREENS = { from: 90, duration: SCREENS_DURATION }; // 7 x 54 = 378
const TURN = { from: SCREENS.from + SCREENS.duration - 6, duration: 66 };
const CLOSE = { from: TURN.from + TURN.duration - 6, duration: 78 };

export const REEL_DURATION = CLOSE.from + CLOSE.duration; // 600 frames, 20s

export const ShilakshyaReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: SH.deep, fontFamily: nepali }}>
    {AUDIO ? <Audio src={staticFile(AUDIO)} volume={0.35} /> : null}
    <Voiceover />
    <Backdrop />
    <Scene {...HOOK} fadeIn={5} fadeOut={5}>
      <Hook />
    </Scene>
    <Scene {...SCREENS} fadeIn={5} fadeOut={5}>
      <Screens />
    </Scene>
    <Scene {...TURN} fadeIn={5} fadeOut={5}>
      <Turn />
    </Scene>
    <Scene {...CLOSE} fadeIn={5} fadeOut={0}>
      <Close />
    </Scene>
  </AbsoluteFill>
);
