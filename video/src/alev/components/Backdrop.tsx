import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AL } from "../brand";

/**
 * The room the reel is set in: charcoal, with the coals glowing low and an
 * Iznik eight-point star repeating across it at almost nothing.
 *
 * The tile is drawn rather than tiled from an image so it scales cleanly and
 * weighs nothing, and it drifts a few pixels a second — enough that the
 * background is alive under a still photograph, not enough to notice.
 */
export const Backdrop: React.FC<{ ember?: string; gold?: string }> = ({
  ember = AL.ember,
  gold = AL.gold,
}) => {
  const frame = useCurrentFrame();
  const shift = (frame * 0.28) % 132;
  const glow = interpolate(Math.sin(frame / 46), [-1, 1], [0.72, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: AL.char }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ display: "block" }}>
        <defs>
          <pattern id="iznik" width="132" height="132" patternUnits="userSpaceOnUse"
                   patternTransform={`translate(${shift} ${shift * 0.5})`}>
            {/* Two squares at 45° to each other — the star that covers every
                Ottoman tile wall there is. */}
            <g fill="none" stroke={gold} strokeWidth="1.6" opacity="0.62">
              <rect x="34" y="34" width="64" height="64" />
              <rect x="34" y="34" width="64" height="64" transform="rotate(45 66 66)" />
              <circle cx="66" cy="66" r="5" />
            </g>
          </pattern>
          <radialGradient id="coals" cx="50%" cy="88%" r="62%">
            <stop offset="0%" stopColor={gold} stopOpacity="0.2" />
            <stop offset="42%" stopColor={ember} stopOpacity="0.26" />
            <stop offset="100%" stopColor="rgba(18, 13, 12, 0)" />
          </radialGradient>
          <radialGradient id="top" cx="16%" cy="6%" r="58%">
            <stop offset="0%" stopColor={ember} stopOpacity="0.30" />
            <stop offset="100%" stopColor="rgba(18, 13, 12, 0)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="1080" height="1920" fill="url(#iznik)" opacity="0.11" />
        <rect x="0" y="0" width="1080" height="1920" fill="url(#top)" />
        <rect x="0" y="0" width="1080" height="1920" fill="url(#coals)" opacity={glow} />
      </svg>
    </AbsoluteFill>
  );
};
