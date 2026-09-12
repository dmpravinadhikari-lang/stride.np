import React from "react";
import { interpolate, staticFile, useCurrentFrame } from "remotion";
import { AL, rgba } from "../brand";

/**
 * A photograph, held in a shape.
 *
 * Every picture in the reel is one of theirs, and each is shown through a
 * drawn opening rather than dropped in as a rectangle: a pointed arch for the
 * dishes, a wide band for the long things, a plain square in the grid. The
 * arch is the one ornament the reel spends — it says Ottoman without a single
 * scroll or flourish, and it crops a landscape photograph into a portrait
 * frame without cutting the food in half.
 */

/** A two-centred arch: straight sides, a shoulder, and a point at the top. */
const archPath = (w: number, h: number) => {
  const s = h * 0.34; // springing line
  return `M0 ${h} L0 ${s} Q0 ${s * 0.16} ${w / 2} 0 Q${w} ${s * 0.16} ${w} ${s} L${w} ${h} Z`;
};

const bandPath = (w: number, h: number) => `M0 0 L${w} 0 L${w} ${h} L0 ${h} Z`;

type Shape = "arch" | "band" | "square";

export const Frame: React.FC<{
  src: string;
  w: number;
  h: number;
  shape?: Shape;
  /** How much the picture drifts in over the scene, as a fraction. */
  drift?: number;
  /** Frames since the scene opened, so the drift runs on the scene's clock. */
  over?: number;
  rule?: boolean;
}> = ({ src, w, h, shape = "arch", drift = 0.07, over = 90, rule = true }) => {
  const frame = useCurrentFrame();
  const id = React.useId().replace(/:/g, "");
  const d = shape === "arch" ? archPath(w, h) : bandPath(w, h);

  // A slow push in. Photographs of food hold still; the frame is what moves.
  const zoom = interpolate(frame, [0, over], [1, 1 + drift], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const iw = w * zoom;
  const ih = h * zoom;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="0" width={w} height={h} fill={AL.charLift} />
        <image
          href={staticFile(src)}
          x={(w - iw) / 2}
          y={(h - ih) / 2}
          width={iw}
          height={ih}
          preserveAspectRatio="xMidYMid slice"
        />
        {/* A little of the ground washed back over the foot, so type set
            underneath never fights the picture's brightest corner. */}
        <rect x="0" y={h * 0.72} width={w} height={h * 0.28} fill={`url(#foot${id})`} />
      </g>
      <defs>
        <linearGradient id={`foot${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rgba.char(0)} />
          <stop offset="100%" stopColor={rgba.char(0.55)} />
        </linearGradient>
      </defs>
      {rule ? <path d={d} fill="none" stroke={AL.gold} strokeWidth="2.5" opacity="0.9" /> : null}
      {rule && shape === "arch" ? (
        <>
          {/* A keystone at the apex, and a second hairline inside the first. */}
          <path
            d={archPath(w - 22, h - 22)}
            transform="translate(11 11)"
            fill="none"
            stroke={AL.gold}
            strokeWidth="1"
            opacity="0.34"
          />
          <path d={`M${w / 2} -14 L${w / 2 + 15} 3 L${w / 2} 20 L${w / 2 - 15} 3 Z`} fill={AL.gold} />
        </>
      ) : null}
    </svg>
  );
};
