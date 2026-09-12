import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { geometric, nepali } from "../../fonts";
import { AL, rgba } from "../brand";

/** Everything in the reel arrives the same way: up a little, and in. */
export const Rise: React.FC<{ delay?: number; up?: number; children: React.ReactNode }> = ({
  delay = 0,
  up = 26,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 150, mass: 0.7 },
    durationInFrames: 24,
  });
  return (
    <div
      style={{
        opacity: interpolate(s, [0, 0.32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        transform: `translateY(${(1 - s) * up}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** Small gold capitals with air between them — the reel's labels. */
export const Kicker: React.FC<{ children: React.ReactNode; colour?: string }> = ({
  children,
  colour = AL.gold,
}) => (
  <div
    style={{
      fontFamily: geometric,
      fontWeight: 500,
      fontSize: 27,
      letterSpacing: "0.34em",
      textTransform: "uppercase",
      color: colour,
      textIndent: "0.34em",
    }}
  >
    {children}
  </div>
);

/** The headline voice: Jost, heavy, set in capitals and kept tight. */
export const Head: React.FC<{ size?: number; colour?: string; children: React.ReactNode }> = ({
  size = 96,
  colour = AL.cream,
  children,
}) => (
  <div
    style={{
      fontFamily: geometric,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.02,
      letterSpacing: "-0.005em",
      textTransform: "uppercase",
      color: colour,
      textShadow: "0 10px 34px rgba(10, 6, 6, 0.55)",
    }}
  >
    {children}
  </div>
);

/** A line of description under a dish. */
export const Say: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 34, children }) => (
  <div
    style={{
      fontFamily: geometric,
      fontWeight: 400,
      fontSize: size,
      lineHeight: 1.34,
      color: rgba.cream(0.78),
    }}
  >
    {children}
  </div>
);

/** The one Nepali line, in the face that is drawn for it. */
export const Nepali: React.FC<{ size?: number; children: React.ReactNode }> = ({
  size = 42,
  children,
}) => (
  <div
    style={{
      fontFamily: nepali,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1.4,
      color: AL.goldPale,
    }}
  >
    {children}
  </div>
);

/** A hairline with a diamond on it, for closing a block off. */
export const Rule: React.FC<{ width?: number }> = ({ width = 300 }) => (
  <svg width={width} height="14" viewBox={`0 0 ${width} 14`} style={{ display: "block" }}>
    <path d={`M0 7 H${width / 2 - 13}`} stroke={AL.gold} strokeWidth="1.4" opacity="0.7" />
    <path d={`M${width / 2 + 13} 7 H${width}`} stroke={AL.gold} strokeWidth="1.4" opacity="0.7" />
    <path d={`M${width / 2} 0 L${width / 2 + 9} 7 L${width / 2} 14 L${width / 2 - 9} 7 Z`} fill={AL.gold} />
  </svg>
);
