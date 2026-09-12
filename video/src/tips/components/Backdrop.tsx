import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SKIES } from "../copy";
import { Icon, type IconName } from "../../shilakshya/components/icons";

const PLANT: { key: string; icon: IconName; x: number; size: number; drift: number; phase: number }[] = [
  { key: "crane", icon: "crane", x: 0.9, size: 220, drift: 0.4, phase: 0.1 },
  { key: "mixer", icon: "mixer", x: 0.1, size: 150, drift: 0.7, phase: 0.5 },
  { key: "bricks", icon: "bricks", x: 0.78, size: 130, drift: 0.9, phase: 0.75 },
  { key: "hat", icon: "hardHat", x: 0.16, size: 140, drift: 0.8, phase: 0.28 },
];

/**
 * The sky over the build, and the hills behind it.
 *
 * The gradient walks through five skies as the five tips go by, so the house
 * is finished in the late afternoon light it started the morning without. The
 * hills are the one thing on screen that was already there.
 */
export const Backdrop: React.FC<{ stage: number; blend: number }> = ({ stage, blend }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const i = Math.min(SKIES.length - 1, Math.max(0, stage - 1));
  const j = Math.min(SKIES.length - 1, i + 1);
  const mix = (a: string, b: string) => (blend < 0.5 ? a : b);
  const sky = SKIES[i].map((c, k) => mix(c, SKIES[j][k])) as [string, string, string];

  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 58%, ${sky[2]} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(48% 26% at 78% 18%, rgba(255, 214, 140, 0.3), rgba(0,0,0,0) 70%)`,
        }}
      />

      {PLANT.map((p) => {
        const t = ((progress * p.drift + p.phase) % 1 + 1) % 1;
        return (
          <div
            key={p.key}
            style={{
              position: "absolute",
              left: p.x * width - p.size / 2,
              top: t * (height * 0.62) - 120,
              opacity: 0.1,
              transform: `rotate(${Math.sin((frame + p.phase * 300) / 90) * 6}deg)`,
            }}
          >
            <Icon name={p.icon} size={p.size} color="#FFFFFF" />
          </div>
        );
      })}

      {/* The valley rim, which is behind every plot in Kathmandu. Its foot
          sits at the same line as the plot, so the house stands in front of
          the hills rather than on top of them. */}
      <svg
        viewBox="0 0 1080 300"
        width={width}
        height={320}
        preserveAspectRatio="none"
        style={{ position: "absolute", left: 0, bottom: 208, opacity: 0.34 }}
      >
        <path d="M0 170 L120 96 L250 156 L380 70 L520 150 L640 104 L790 168 L910 110 L1080 172 V300 H0Z" fill="#0E2A3E" />
        <path d="M0 214 L160 160 L300 210 L470 150 L620 206 L800 156 L960 208 L1080 168 V300 H0Z" fill="#0A2032" />
      </svg>

      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(8,20,34,0.42) 0%, rgba(8,20,34,0) 26%, rgba(8,20,34,0) 70%, rgba(8,20,34,0.5) 100%)`,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        }}
      />
    </AbsoluteFill>
  );
};
