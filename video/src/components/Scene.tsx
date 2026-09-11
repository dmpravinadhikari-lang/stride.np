import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";

const Fade: React.FC<{
  duration: number;
  fadeIn: number;
  fadeOut: number;
  children: React.ReactNode;
}> = ({ duration, fadeIn, fadeOut, children }) => {
  const frame = useCurrentFrame();
  // Kept strictly increasing whatever the caller asks for: a scene shorter
  // than its own fades, or fadeOut 0 to hold to the end, must not hand
  // interpolate() a range that goes backwards.
  const inEnd = Math.max(0.001, Math.min(fadeIn, duration * 0.4));
  const outStart = Math.max(
    inEnd + 0.001,
    duration - Math.min(Math.max(fadeOut, 0), duration * 0.4),
  );
  const end = Math.max(outStart + 0.001, duration);
  const opacity = interpolate(
    frame,
    [0, inEnd, outStart, end],
    [0, 1, 1, fadeOut > 0 ? 0 : 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * One scene, faded in and out on its own clock. Scenes are given overlapping
 * ranges in `StrideIntro`, so the fades cross rather than passing through an
 * empty frame.
 */
export const Scene: React.FC<{
  from: number;
  duration: number;
  /** Frames to fade in and out over. A reel wants these much shorter. */
  fadeIn?: number;
  fadeOut?: number;
  children: React.ReactNode;
}> = ({ from, duration, fadeIn = 12, fadeOut = 16, children }) => (
  <Sequence from={from} durationInFrames={duration} layout="none">
    <Fade duration={duration} fadeIn={fadeIn} fadeOut={fadeOut}>
      {children}
    </Fade>
  </Sequence>
);
