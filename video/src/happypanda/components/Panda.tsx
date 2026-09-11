import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * A panda character, dropped in on a spring and then breathing.
 *
 * The artwork is transparent PNG, so it sits straight on the ground with no
 * plate behind it; the only thing under it is a soft contact shadow, which is
 * what stops a cut-out floating.
 */
export const Panda: React.FC<{
  src: string;
  width: number;
  /** Frame the entrance starts on, relative to the scene. */
  at?: number;
  /** Degrees of tilt held through the shot. */
  tilt?: number;
  /** Pixels it rises through as it lands. */
  rise?: number;
  shadow?: boolean;
}> = ({ src, width, at = 0, tilt = 0, rise = 90, shadow = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({
    frame: frame - at,
    fps,
    config: { damping: 13, stiffness: 170, mass: 0.7 },
    durationInFrames: 34,
  });
  // A slow bob once it has landed, so the character is never a still cut-out.
  const bob = Math.sin(Math.max(0, frame - at) / 15) * 7 * pop;

  return (
    <div
      style={{
        position: "relative",
        width,
        opacity: interpolate(pop, [0, 0.35], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        transform: `translateY(${(1 - pop) * rise + bob}px) scale(${interpolate(pop, [0, 1], [0.82, 1])}) rotate(${tilt}deg)`,
      }}
    >
      {shadow ? (
        <div
          style={{
            position: "absolute",
            left: "14%",
            right: "14%",
            bottom: "1%",
            height: width * 0.09,
            borderRadius: "50%",
            background: "rgba(8, 32, 48, 0.32)",
            filter: "blur(26px)",
          }}
        />
      ) : null}
      <Img src={staticFile(src)} style={{ width: "100%", display: "block" }} />
    </div>
  );
};
