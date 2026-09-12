import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { HP, rgba } from "../brand";
import { Icon, type IconName } from "./icons";

/** One leaf from the sprig behind the panda's ear, drawn rather than cut out. */
const Leaf: React.FC<{ size: number; rotate: number }> = ({ size, rotate }) => (
  <svg
    width={size}
    height={size * 0.56}
    viewBox="0 0 120 68"
    style={{ transform: `rotate(${rotate}deg)`, display: "block" }}
  >
    <path d="M0 34C30 4 90 -2 120 34 90 70 30 64 0 34Z" fill={rgba.bamboo(0.5)} />
    <path d="M6 34H114" stroke={rgba.bamboo(0.8)} strokeWidth="2" fill="none" />
  </svg>
);

/**
 * What drifts behind the reel: the paperwork and the places.
 *
 * `x` is a fraction of the frame, `size` the icon's box in pixels, `drift` how
 * many frame-heights it travels over the reel, and `phase` where in that
 * travel it starts — so nothing is ever stacked on anything else, and there is
 * always something on screen without anything asking to be looked at.
 */
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

const FLOATS: Float[] = [
  { key: "ben", icon: "bigBen", x: 0.12, size: 210, drift: 0.55, phase: 0.05, spin: 5, opacity: 0.15 },
  { key: "opera", icon: "operaHouse", x: 0.86, size: 230, drift: 0.45, phase: 0.42, spin: -4, opacity: 0.15 },
  { key: "passport", icon: "passport", x: 0.78, size: 140, drift: 0.8, phase: 0.12, spin: 9, opacity: 0.13 },
  { key: "pass", icon: "boardingPass", x: 0.2, size: 170, drift: 0.7, phase: 0.62, spin: -10, opacity: 0.13 },
  { key: "maple", icon: "maple", x: 0.9, size: 160, drift: 1.0, phase: 0.78, spin: 14, opacity: 0.12 },
  { key: "cap", icon: "cap", x: 0.07, size: 150, drift: 0.9, phase: 0.3, spin: -8, opacity: 0.13 },
  { key: "globe", icon: "globe", x: 0.5, size: 260, drift: 0.35, phase: 0.55, spin: 3, opacity: 0.09 },
  { key: "case", icon: "suitcase", x: 0.68, size: 130, drift: 0.85, phase: 0.88, spin: 7, opacity: 0.12 },
  { key: "plane2", icon: "plane", x: 0.34, size: 110, drift: 1.15, phase: 0.2, spin: 12, opacity: 0.12 },
];

const LEAVES = [
  { key: "a", x: 0.05, size: 170, drift: 0.95, rotate: -18, phase: 0.0 },
  { key: "b", x: 0.95, size: 140, drift: 0.65, rotate: 24, phase: 0.35 },
  { key: "c", x: 0.44, size: 105, drift: 1.3, rotate: 8, phase: 0.7 },
];

/**
 * The flight path, as a quadratic curve the plane actually flies along:
 * the dashes are the same curve, so the aircraft never drifts off its own line.
 */
const PATH = { p0: [-160, 1610], p1: [560, 520], p2: [1260, 980] } as const;

const at = (t: number) => {
  const u = 1 - t;
  return [
    u * u * PATH.p0[0] + 2 * u * t * PATH.p1[0] + t * t * PATH.p2[0],
    u * u * PATH.p0[1] + 2 * u * t * PATH.p1[1] + t * t * PATH.p2[1],
  ];
};

const heading = (t: number) => {
  const dx = 2 * (1 - t) * (PATH.p1[0] - PATH.p0[0]) + 2 * t * (PATH.p2[0] - PATH.p1[0]);
  const dy = 2 * (1 - t) * (PATH.p1[1] - PATH.p0[1]) + 2 * t * (PATH.p2[1] - PATH.p1[1]);
  // The plane icon points up the screen, so its nose is already 90° round.
  return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
};

export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  const wrap = (drift: number, phase: number) => {
    const t = (progress * drift + phase) % 1;
    return (t < 0 ? t + 1 : t) * (height + 520) - 260;
  };

  const flight = Math.min(1, progress * 1.08);
  const [px, py] = at(flight);

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

      {/* A map graticule, faint enough to be texture rather than a grid. */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${rgba.white(0.16)} 1.5px, transparent 1.6px)`,
          backgroundSize: "46px 46px",
          opacity: 0.5,
        }}
      />

      {/* The route: dashed, with the aircraft somewhere along it. */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <path
          d={`M${PATH.p0[0]} ${PATH.p0[1]} Q${PATH.p1[0]} ${PATH.p1[1]} ${PATH.p2[0]} ${PATH.p2[1]}`}
          fill="none"
          stroke={rgba.white(0.22)}
          strokeWidth={3}
          strokeDasharray="14 18"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: px - 42,
          top: py - 42,
          transform: `rotate(${heading(flight)}deg)`,
          opacity: 0.5,
        }}
      >
        <Icon name="plane" size={84} color={rgba.white(0.85)} />
      </div>

      {FLOATS.map((f) => (
        <div
          key={f.key}
          style={{
            position: "absolute",
            left: f.x * width - f.size / 2,
            top: wrap(f.drift, f.phase),
            transform: `rotate(${Math.sin((frame + f.phase * 400) / 90) * f.spin}deg)`,
            opacity: f.opacity,
          }}
        >
          <Icon name={f.icon} size={f.size} color={HP.white} />
        </div>
      ))}

      {LEAVES.map((leaf) => (
        <div
          key={leaf.key}
          style={{
            position: "absolute",
            left: leaf.x * width - leaf.size / 2,
            top: wrap(leaf.drift, leaf.phase),
            transform: `rotate(${Math.sin((frame + leaf.phase * 300) / 70) * 14}deg)`,
            opacity: 0.45,
          }}
        >
          <Leaf size={leaf.size} rotate={leaf.rotate} />
        </div>
      ))}

      {/* Pulls the edges down so the type and the phone stay on top of it all. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(86% 58% at 50% 50%, rgba(0,0,0,0) 34%, ${rgba.ink(0.42)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
