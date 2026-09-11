import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";

const HOLD_IN = 12;
const HOLD_OUT = 16;

const Fade: React.FC<{ duration: number; children: React.ReactNode }> = ({
  duration,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, HOLD_IN, duration - HOLD_OUT, duration],
    [0, 1, 1, 0],
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
  children: React.ReactNode;
}> = ({ from, duration, children }) => (
  <Sequence from={from} durationInFrames={duration} layout="none">
    <Fade duration={duration}>{children}</Fade>
  </Sequence>
);
