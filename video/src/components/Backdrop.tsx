import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, rgba } from "../brand";

/**
 * The ground every scene sits on, rendered once outside the sequences so the
 * cuts read as one continuous piece rather than four separate cards.
 *
 * Two cyan glows drift against each other over the length of the video, a
 * hairline grid fades out towards the edges, and a rule along the bottom
 * fills as the video plays.
 */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const drift = Math.sin(t * Math.PI * 2);
  const grid = rgba.wash(0.05);
  const fade =
    "radial-gradient(72% 68% at 50% 46%, #000 0%, rgba(0,0,0,0.35) 62%, transparent 100%)";

  return (
    <AbsoluteFill style={{ backgroundColor: C.ground }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(58% 54% at ${18 + drift * 7}% ${16 + drift * 5}%, ${rgba.signature(0.22)}, rgba(0,22,25,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(56% 52% at ${84 - drift * 6}% ${86 + drift * 4}%, ${rgba.mid(0.24)}, rgba(0,22,25,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${grid} 1px, transparent 1px), linear-gradient(90deg, ${grid} 1px, transparent 1px)`,
          backgroundSize: "104px 104px",
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(88% 78% at 50% 50%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.5) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 5,
          background: rgba.wash(0.1),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 5,
          width: `${t * 100}%`,
          background: C.signature,
          opacity: 0.9,
        }}
      />
    </AbsoluteFill>
  );
};
