import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ART, SAFE, SH, SITE, rgba } from "../brand";
import { nepali } from "../../fonts";

/**
 * The end card.
 *
 * The site ships a white version of the mark for exactly this — a dark ground
 * — so it goes straight onto the navy with no card behind it.
 */
export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mark = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 150, mass: 0.7 },
    durationInFrames: 32,
  });
  const address = spring({ frame: frame - 14, fps, config: { damping: 200 }, durationInFrames: 24 });
  const cta = spring({ frame: frame - 24, fps, config: { damping: 200 }, durationInFrames: 24 });

  return (
    <AbsoluteFill
      style={{
        paddingTop: SAFE.top,
        paddingBottom: SAFE.bottom,
        paddingLeft: SAFE.side,
        paddingRight: SAFE.side,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Img
        src={staticFile(ART.logoWhite)}
        style={{
          width: 660,
          display: "block",
          opacity: interpolate(mark, [0, 0.3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${(1 - mark) * 40}px) scale(${interpolate(mark, [0, 1], [0.92, 1])})`,
        }}
      />

      <div
        style={{
          marginTop: 34,
          fontFamily: nepali,
          fontWeight: 800,
          fontSize: 62,
          color: SH.gold,
          opacity: address,
          transform: `translateY(${(1 - address) * 18}px)`,
        }}
      >
        {SITE}
      </div>

      <div
        style={{
          marginTop: 26,
          padding: "14px 36px",
          borderRadius: 999,
          border: `2px solid ${rgba.white(0.45)}`,
          fontFamily: nepali,
          fontWeight: 600,
          fontSize: 32,
          letterSpacing: "0.2em",
          color: rgba.white(0.94),
          opacity: cta,
          transform: `translateY(${(1 - cta) * 14}px)`,
        }}
      >
        LINK IN BIO
      </div>
    </AbsoluteFill>
  );
};
