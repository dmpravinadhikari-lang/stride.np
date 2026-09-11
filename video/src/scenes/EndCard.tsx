import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, C, rgba } from "../brand";
import { display, sans } from "../fonts";
import { Wordmark } from "../components/Wordmark";

/**
 * Where to go. The mark again, the line the product is sold on, and the
 * domain — nothing else, because an end card that asks for two things gets
 * neither.
 */
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mark = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.9 },
    durationInFrames: 30,
  });
  const line = spring({
    frame: frame - 14,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });
  const domain = spring({
    frame: frame - 24,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });

  // The dot breathes once the card has settled, so the last four seconds are
  // not a still frame.
  const pulse = 1 + 0.05 * Math.sin(Math.max(0, frame - 34) / 13);

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          opacity: mark,
          transform: `scale(${interpolate(mark, [0, 1], [0.94, 1])})`,
        }}
      >
        <Wordmark size={190} dotScale={pulse} />
      </div>

      <div
        style={{
          marginTop: 30,
          fontFamily: sans,
          fontWeight: 400,
          fontSize: 38,
          letterSpacing: "-0.01em",
          color: C.wash,
          opacity: line * 0.9,
          transform: `translateY(${(1 - line) * 16}px)`,
        }}
      >
        {BRAND.tagline}
      </div>

      <div
        style={{
          marginTop: 54,
          display: "inline-block",
          padding: "18px 46px",
          borderRadius: 999,
          border: `1px solid ${rgba.signature(0.45)}`,
          background: rgba.deep(0.35),
          fontFamily: display,
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: "0.24em",
          color: C.signature,
          opacity: domain,
          transform: `translateY(${(1 - domain) * 14}px)`,
        }}
      >
        {BRAND.domain.toUpperCase()}
      </div>
    </div>
  );
};
