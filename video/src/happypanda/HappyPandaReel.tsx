import React from "react";
import { AbsoluteFill } from "remotion";
import { HP } from "./brand";
import { sans } from "../fonts";
import { Scene } from "../components/Scene";
import { Backdrop } from "./components/Backdrop";
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
const ASK = { from: 74, duration: 76 };
const SCREENS = { from: 144, duration: SCREENS_DURATION }; // 6 x 31 = 186
const ONE_PLACE = { from: SCREENS.from + SCREENS.duration - 6, duration: 60 };
const CLOSE = { from: ONE_PLACE.from + ONE_PLACE.duration - 6, duration: 78 };

export const REEL_DURATION = CLOSE.from + CLOSE.duration; // 456 frames, 15.2s

export const HappyPandaReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: HP.deep, fontFamily: sans }}>
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
