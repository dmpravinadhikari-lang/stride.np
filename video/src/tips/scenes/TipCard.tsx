import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { nepali } from "../../fonts";
import type { Tip } from "../copy";
import { TipArt } from "../components/TipArt";

/** One tip: the number, the line, and the sheet that explains it. */
export const TipCard: React.FC<{ tip: Tip }> = ({ tip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chip = spring({ frame, fps, config: { damping: 13, stiffness: 200, mass: 0.5 }, durationInFrames: 20 });
  const title = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 170, mass: 0.6 }, durationInFrames: 24 });
  const body = spring({ frame: frame - 10, fps, config: { damping: 200 }, durationInFrames: 22 });

  return (
    <div style={{ textAlign: "center", width: "100%" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 18,
          padding: "10px 30px 10px 12px",
          borderRadius: 999,
          background: tip.colour,
          opacity: interpolate(chip, [0, 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - chip) * 20}px) scale(${interpolate(chip, [0, 1], [0.9, 1])})`,
        }}
      >
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.92)",
            color: tip.colour,
            fontFamily: nepali,
            fontWeight: 800,
            fontSize: 36,
            lineHeight: "56px",
          }}
        >
          {tip.n}
        </span>
        <span
          style={{
            fontFamily: nepali,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: "0.16em",
            color: "#FFFFFF",
          }}
        >
          TIP
        </span>
      </div>

      <div
        style={{
          marginTop: 24,
          fontFamily: nepali,
          fontWeight: 800,
          fontSize: 78,
          lineHeight: 1.34,
          color: "#FFFFFF",
          textShadow: "0 6px 26px rgba(6, 18, 30, 0.5)",
          opacity: interpolate(title, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - title) * 30}px)`,
        }}
      >
        {tip.title}
      </div>

      <div
        style={{
          marginTop: 10,
          fontFamily: nepali,
          fontWeight: 600,
          fontSize: 42,
          lineHeight: 1.5,
          color: "rgba(255,255,255,0.95)",
          textShadow: "0 4px 18px rgba(6, 18, 30, 0.55)",
          opacity: body,
          transform: `translateY(${(1 - body) * 14}px)`,
        }}
      >
        {tip.line}
      </div>

      <div style={{ marginTop: 34, display: "flex", justifyContent: "center" }}>
        <TipArt name={tip.art} colour={tip.colour} width={920} />
      </div>
    </div>
  );
};
