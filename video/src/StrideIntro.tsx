import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "./brand";
import { sans } from "./fonts";
import { Backdrop } from "./components/Backdrop";
import { Scene } from "./components/Scene";
import { Mark } from "./scenes/Mark";
import { Capabilities } from "./scenes/Capabilities";
import { Pipeline } from "./scenes/Pipeline";
import { EndCard } from "./scenes/EndCard";

export const FPS = 30;
export const DURATION = 570; // 19 seconds

/**
 * Scene ranges overlap by ten frames so the fades cross. The last scene is
 * given more room than the composition has left, which keeps its fade-out
 * off the end of the video — it holds on the mark instead of dissolving.
 */
export const StrideIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.ground, fontFamily: sans }}>
      <Backdrop />
      <Scene from={0} duration={132}>
        <Mark />
      </Scene>
      <Scene from={122} duration={180}>
        <Capabilities />
      </Scene>
      <Scene from={292} duration={170}>
        <Pipeline />
      </Scene>
      <Scene from={452} duration={140}>
        <EndCard />
      </Scene>
    </AbsoluteFill>
  );
};
