import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { HP, rgba } from "../brand";

/** One leaf from the sprig behind the panda's ear, drawn rather than cut out. */
const Leaf: React.FC<{ size: number; rotate: number }> = ({ size, rotate }) => (
  <svg
    width={size}
    height={size * 0.56}
    viewBox="0 0 120 68"
    style={{ transform: `rotate(${rotate}deg)`, display: "block" }}
  >
    <path
      d="M0 34C30 4 90 -2 120 34 90 70 30 64 0 34Z"
      fill={rgba.bamboo(0.55)}
    />
    <path d="M6 34H114" stroke={rgba.bamboo(0.85)} strokeWidth="2" fill="none" />
  </svg>
);

const LEAVES = [
  { key: "a", x: 0.08, size: 190, drift: 1.0, rotate: -18, delay: 0 },
  { key: "b", x: 0.78, size: 150, drift: 0.7, rotate: 24, delay: 120 },
  { key: "c", x: 0.42, size: 110, drift: 1.4, rotate: 8, delay: 240 },
  { key: "d", x: 0.92, size: 210, drift: 0.5, rotate: -36, delay: 60 },
  { key: "e", x: 0.22, size: 130, drift: 1.1, rotate: 42, delay: 300 },
];

/**
 * The ground the whole reel sits on, rendered once outside the scenes so the
 * cuts land on a continuous picture. Bamboo leaves fall slowly behind
 * everything, which is the one piece of decoration the brand earns.
 */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(168deg, ${HP.deep} 0%, ${HP.brand} 52%, ${HP.scarf} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 30% at 16% 8%, ${rgba.white(0.2)}, rgba(255,255,255,0) 70%)`,
        }}
      />

      {LEAVES.map((leaf) => {
        // Each leaf falls the height of the frame over the reel, wrapping, so
        // there is always movement behind the cuts without anything to watch.
        const t = ((frame + leaf.delay) * leaf.drift) / durationInFrames;
        const y = ((t % 1) + 1) % 1;
        return (
          <div
            key={leaf.key}
            style={{
              position: "absolute",
              left: leaf.x * width - leaf.size / 2,
              top: y * (height + 400) - 200,
              transform: `rotate(${Math.sin((frame + leaf.delay) / 70) * 14}deg)`,
              opacity: 0.5,
            }}
          >
            <Leaf size={leaf.size} rotate={leaf.rotate} />
          </div>
        );
      })}

      <AbsoluteFill
        style={{
          background: `radial-gradient(92% 62% at 50% 52%, rgba(0,0,0,0) 40%, ${rgba.ink(0.34)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
