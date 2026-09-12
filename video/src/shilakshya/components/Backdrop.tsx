import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SH, rgba } from "../brand";
import { Icon, type IconName } from "./icons";

type Float = {
  key: string;
  icon: IconName;
  x: number;
  size: number;
  drift: number;
  phase: number;
  spin: number;
  opacity: number;
};

/**
 * The plant and the materials, drifting behind everything. `x` is a fraction
 * of the frame, `drift` how many frame-heights each travels over the reel, and
 * `phase` where in that travel it starts, so nothing ever stacks on anything
 * else and there is always something moving without anything asking to be
 * looked at.
 */
const FLOATS: Float[] = [
  { key: "dozer", icon: "dozer", x: 0.14, size: 230, drift: 0.5, phase: 0.06, spin: 4, opacity: 0.13 },
  { key: "crane", icon: "crane", x: 0.87, size: 250, drift: 0.42, phase: 0.44, spin: -3, opacity: 0.13 },
  { key: "mixer", icon: "mixer", x: 0.76, size: 175, drift: 0.72, phase: 0.14, spin: 8, opacity: 0.12 },
  { key: "bricks", icon: "bricks", x: 0.2, size: 160, drift: 0.82, phase: 0.63, spin: -6, opacity: 0.12 },
  { key: "hat", icon: "hardHat", x: 0.93, size: 150, drift: 0.95, phase: 0.8, spin: 11, opacity: 0.12 },
  { key: "shovel", icon: "shovel", x: 0.07, size: 165, drift: 0.88, phase: 0.31, spin: -9, opacity: 0.12 },
  { key: "truss", icon: "truss", x: 0.5, size: 270, drift: 0.34, phase: 0.55, spin: 2, opacity: 0.08 },
  { key: "trowel", icon: "trowel", x: 0.66, size: 140, drift: 1.05, phase: 0.9, spin: 13, opacity: 0.11 },
  { key: "level", icon: "level", x: 0.34, size: 185, drift: 1.15, phase: 0.22, spin: 7, opacity: 0.11 },
];

/**
 * The ground: the navy of the mark, a blueprint grid over it, and the plant
 * drifting through. The grid is the one piece of decoration this trade earns —
 * every house on the site started as one.
 */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  const wrap = (drift: number, phase: number) => {
    const t = (progress * drift + phase) % 1;
    return (t < 0 ? t + 1 : t) * (height + 560) - 280;
  };

  const fine = rgba.white(0.05);
  const bold = rgba.gold(0.13);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(168deg, ${SH.deep} 0%, ${SH.mid} 52%, ${SH.steel} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(52% 32% at 18% 6%, ${rgba.gold(0.17)}, rgba(12,26,43,0) 72%)`,
        }}
      />

      {/* Blueprint: a fine grid, and a heavier line every fifth one. */}
      <AbsoluteFill
        style={{
          backgroundImage:
            `linear-gradient(${fine} 1px, transparent 1px),` +
            `linear-gradient(90deg, ${fine} 1px, transparent 1px),` +
            `linear-gradient(${bold} 1.5px, transparent 1.5px),` +
            `linear-gradient(90deg, ${bold} 1.5px, transparent 1.5px)`,
          backgroundSize: "54px 54px, 54px 54px, 270px 270px, 270px 270px",
          // Drifts a grid-cell over the reel, so it breathes without sliding.
          backgroundPosition: `0 ${progress * 54}px, 0 0, 0 ${progress * 54}px, 0 0`,
        }}
      />

      {FLOATS.map((f) => (
        <div
          key={f.key}
          style={{
            position: "absolute",
            left: f.x * width - f.size / 2,
            top: wrap(f.drift, f.phase),
            transform: `rotate(${Math.sin((frame + f.phase * 400) / 95) * f.spin}deg)`,
            opacity: f.opacity,
          }}
        >
          <Icon name={f.icon} size={f.size} color={SH.white} />
        </div>
      ))}

      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 58% at 50% 50%, rgba(0,0,0,0) 34%, ${rgba.navy(0.55)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
