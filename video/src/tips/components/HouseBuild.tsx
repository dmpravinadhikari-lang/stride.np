import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";

/**
 * A house that builds itself, one stage per tip.
 *
 * Stage 1 pegs out the plot, 2 pours the foundation, 3 raises the frame,
 * 4 fills the walls and puts the first floor on, 5 finishes it — parapet,
 * water tank, windows, paint. By the end card someone lives there.
 *
 * Every element declares the stage it arrives at. Anything from an earlier
 * stage is simply there; the current stage's pieces spring in on a stagger, so
 * the drawing is always doing something without ever being redrawn.
 */
const C = {
  ground: "#6E5A44",
  grass: "#4FB06E",
  peg: "#F2D9A0",
  concrete: "#BFC4C9",
  column: "#D7DBDF",
  wall: "#F0DCC0",
  wallShade: "#E0C6A4",
  band: "#DFA340",
  door: "#8B5E3C",
  glass: "#6FC8F0",
  frame: "#FFFFFF",
  tank: "#2E7FB8",
  tree: "#3E8E5A",
  trunk: "#7A5230",
};

export const HouseBuild: React.FC<{
  /** 1-5, the tip being shown. */
  stage: number;
  /** Frames elapsed inside that tip. */
  frameInStage: number;
  width: number;
}> = ({ stage, frameInStage, width }) => {
  const { fps } = useVideoConfig();

  /** 0 before its stage, springs in during it, 1 after. */
  const show = (from: number, delay = 0) => {
    if (stage < from) return 0;
    if (stage > from) return 1;
    return spring({
      frame: frameInStage - delay,
      fps,
      config: { damping: 14, stiffness: 170, mass: 0.6 },
      durationInFrames: 26,
    });
  };

  /** Rises into place from below, the way everything on a site does. */
  const rise = (v: number, by = 26) => `translate(0 ${(1 - v) * by})`;

  return (
    <svg
      width={width}
      height={width * (340 / 420)}
      viewBox="0 0 420 340"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* ---------------------------------------------------------- ground */}
      <rect x="0" y="300" width="420" height="40" fill={C.ground} />
      <rect x="0" y="300" width="420" height="9" fill={C.grass} />

      {/* ------------------------------------------ 1 · the plot, pegged out */}
      <g opacity={show(1)}>
        <path
          d="M62 300 H358"
          stroke={C.peg}
          strokeWidth="3"
          strokeDasharray="10 8"
          fill="none"
        />
        {[62, 152, 268, 358].map((x, i) => (
          <g key={x} opacity={show(1, i * 3)} transform={rise(show(1, i * 3), 16)}>
            <rect x={x - 3} y="278" width="6" height="24" rx="2" fill={C.peg} />
            <path d={`M${x - 3} 278 l6 -8 6 8 z`} fill={C.band} />
          </g>
        ))}
        {/* A tree that was there before you were. */}
        <g opacity={show(1, 10)} transform={rise(show(1, 10), 12)}>
          <rect x="386" y="268" width="8" height="34" rx="3" fill={C.trunk} />
          <circle cx="390" cy="256" r="24" fill={C.tree} />
          <circle cx="374" cy="268" r="15" fill={C.tree} />
          <circle cx="404" cy="268" r="14" fill={C.tree} />
        </g>
      </g>

      {/* ------------------------------------------------- 2 · the foundation */}
      <g opacity={show(2)} transform={rise(show(2))}>
        {[92, 152, 248, 308].map((x, i) => (
          <rect
            key={x}
            x={x - 9}
            y="286"
            width="32"
            height="18"
            rx="2"
            fill={C.concrete}
            opacity={show(2, i * 2)}
          />
        ))}
        <rect x="80" y="284" width="260" height="16" rx="2" fill={C.concrete} />
      </g>

      {/* ------------------------------------------------ 3 · the ground frame */}
      <g opacity={show(3)}>
        {[92, 152, 248, 308].map((x, i) => (
          <rect
            key={x}
            x={x}
            y="190"
            width="14"
            height="96"
            fill={C.column}
            opacity={show(3, i * 3)}
            transform={rise(show(3, i * 3), 30)}
          />
        ))}
        <g opacity={show(3, 12)} transform={rise(show(3, 12), 20)}>
          <rect x="80" y="176" width="260" height="15" rx="2" fill={C.concrete} />
        </g>
      </g>

      {/* -------------------------------- 4 · walls, and the floor above them */}
      <g opacity={show(4)}>
        <g opacity={show(4, 0)} transform={rise(show(4, 0), 18)}>
          <rect x="92" y="190" width="230" height="96" fill={C.wall} />
          <rect x="92" y="272" width="230" height="14" fill={C.wallShade} />
        </g>
        {[92, 152, 248, 308].map((x, i) => (
          <rect
            key={x}
            x={x}
            y="78"
            width="14"
            height="98"
            fill={C.column}
            opacity={show(4, 8 + i * 3)}
            transform={rise(show(4, 8 + i * 3), 26)}
          />
        ))}
        <g opacity={show(4, 20)} transform={rise(show(4, 20), 18)}>
          <rect x="80" y="64" width="260" height="15" rx="2" fill={C.concrete} />
        </g>
      </g>

      {/* ------------------------------------------------ 5 · finished, lived in */}
      <g opacity={show(5)}>
        <g opacity={show(5, 0)} transform={rise(show(5, 0), 16)}>
          <rect x="92" y="78" width="230" height="98" fill={C.wall} />
          <rect x="92" y="160" width="230" height="12" fill={C.wallShade} />
          <rect x="80" y="56" width="260" height="10" fill={C.band} />
        </g>

        {/* Parapet, and the tank every roof in Kathmandu carries. */}
        <g opacity={show(5, 8)} transform={rise(show(5, 8), 14)}>
          {[86, 118, 150, 182, 214, 246, 278, 310].map((x) => (
            <rect key={x} x={x} y="38" width="18" height="20" rx="2" fill={C.wall} />
          ))}
          <rect x="262" y="10" width="52" height="30" rx="6" fill={C.tank} />
          <rect x="268" y="4" width="40" height="8" rx="3" fill={C.frame} />
          <rect x="272" y="38" width="6" height="8" fill={C.concrete} />
          <rect x="298" y="38" width="6" height="8" fill={C.concrete} />
        </g>

        {/* Door and windows, with the lights on. */}
        <g opacity={show(5, 14)}>
          <rect x="188" y="222" width="44" height="64" rx="3" fill={C.door} />
          <circle cx="224" cy="256" r="3" fill={C.band} />
          {[
            [110, 214],
            [262, 214],
            [110, 100],
            [190, 100],
            [262, 100],
          ].map(([x, y], i) => (
            <g key={`${x}-${y}`} opacity={show(5, 16 + i * 2)}>
              <rect x={x} y={y} width="48" height="42" rx="3" fill={C.frame} />
              <rect x={x + 4} y={y + 4} width="40" height="34" rx="2" fill={C.glass} />
              <rect x={x + 23} y={y + 4} width="3" height="34" fill={C.frame} />
            </g>
          ))}
        </g>

        {/* A plant by the door, because a finished house has one. */}
        <g opacity={show(5, 22)} transform={rise(show(5, 22), 10)}>
          <rect x="246" y="286" width="20" height="16" rx="3" fill={C.door} />
          <circle cx="256" cy="278" r="12" fill={C.tree} />
        </g>
      </g>

      {/* The stage counter, as four bricks stacked by the tree. */}
      <g opacity={interpolate(stage, [0, 1], [0, 1], { extrapolateRight: "clamp" })}>
        {[1, 2, 3, 4, 5].map((s) => (
          <rect
            key={s}
            x={20}
            y={292 - (s - 1) * 13}
            width={22}
            height={10}
            rx="2"
            fill={stage >= s ? C.band : "rgba(255,255,255,0.16)"}
          />
        ))}
      </g>
    </svg>
  );
};
