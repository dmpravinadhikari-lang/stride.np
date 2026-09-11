import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, C, rgba } from "../brand";
import { display, sans } from "../fonts";
import { Wordmark } from "../components/Wordmark";

/**
 * The opening. The cyan dot walks in from off the left edge along the
 * baseline and the letters appear behind it as it passes — the mark taking a
 * stride — then it settles into its place as the full stop.
 */
export const Mark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const walk = spring({
    frame: frame - 6,
    fps,
    config: { damping: 200, mass: 0.9 },
    durationInFrames: 48,
  });
  // Starts left of the word, ends at its resting place just past the "e".
  const dotAt = interpolate(walk, [0, 1], [-0.45, 1]);
  const reveal = Math.min(1, Math.max(0, dotAt + 0.03));

  // A short squash as it lands, so the dot arrives rather than just stops.
  const land = spring({
    frame: frame - 50,
    fps,
    config: { damping: 9, stiffness: 190, mass: 0.6 },
  });
  const dotScale = frame < 50 ? 1 : interpolate(land, [0, 1], [1.5, 1]);

  const tagline = spring({
    frame: frame - 58,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });
  const footer = spring({
    frame: frame - 70,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });

  return (
    <div style={{ textAlign: "center" }}>
      <Wordmark size={172} reveal={reveal} dotAt={dotAt} dotScale={dotScale} />

      <div
        style={{
          marginTop: 26,
          fontFamily: sans,
          fontWeight: 400,
          fontSize: 40,
          letterSpacing: "-0.01em",
          color: C.wash,
          opacity: tagline * 0.92,
          transform: `translateY(${(1 - tagline) * 18}px)`,
        }}
      >
        {BRAND.tagline}
      </div>

      <div
        style={{
          marginTop: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          opacity: footer,
        }}
      >
        <Rule width={footer * 96} />
        <span
          style={{
            fontFamily: display,
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: "0.3em",
            color: C.signature,
          }}
        >
          {BRAND.domain.toUpperCase()}
        </span>
        <Rule width={footer * 96} />
      </div>
    </div>
  );
};

const Rule: React.FC<{ width: number }> = ({ width }) => (
  <span
    style={{
      display: "inline-block",
      width,
      height: 1,
      background: rgba.signature(0.55),
    }}
  />
);
