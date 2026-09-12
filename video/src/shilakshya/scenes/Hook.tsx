import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE, SH, rgba } from "../brand";
import { nepali } from "../../fonts";

/**
 * The question every client arrives with, in the words they arrive with.
 *
 * Set in Devanagari rather than romanised, because that is what reads at a
 * glance on a phone in Nepal — and "Confusion" stays in English because
 * nobody says it any other way.
 */
const LINES = ["घर त बनाउने,", "तर खर्च कति?"];

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrow = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 16 });
  const rule = spring({ frame: frame - 32, fps, config: { damping: 200 }, durationInFrames: 20 });
  const sub = spring({ frame: frame - 44, fps, config: { damping: 200 }, durationInFrames: 24 });

  return (
    <AbsoluteFill
      style={{
        paddingTop: SAFE.top,
        paddingBottom: SAFE.bottom,
        paddingLeft: SAFE.side,
        paddingRight: SAFE.side,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: nepali,
          fontWeight: 600,
          fontSize: 28,
          letterSpacing: "0.26em",
          color: rgba.gold(0.95),
          textAlign: "center",
          opacity: eyebrow,
          transform: `translateY(${(1 - eyebrow) * 14}px)`,
        }}
      >
        SHILAKSHYA GRIHA NIRMAN
      </div>

      <div style={{ marginTop: 52, textAlign: "center" }}>
        {LINES.map((line, i) => {
          const enter = spring({
            frame: frame - 8 - i * 7,
            fps,
            config: { damping: 14, stiffness: 150, mass: 0.6 },
            durationInFrames: 32,
          });
          return (
            <div
              key={line}
              style={{
                position: "relative",
                fontFamily: nepali,
                fontWeight: 800,
                fontSize: 132,
                // Devanagari hangs matras above and below the line, so it needs
                // more room than a Latin headline at the same size.
                lineHeight: 1.32,
                color: i === LINES.length - 1 ? SH.gold : SH.white,
                opacity: interpolate(enter, [0, 0.3], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `translateY(${(1 - enter) * 46}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 18,
          width: rule * 300,
          height: 8,
          borderRadius: 999,
          background: SH.gold,
        }}
      />

      <div
        style={{
          marginTop: 46,
          fontFamily: nepali,
          fontWeight: 600,
          fontSize: 46,
          color: SH.white,
          textAlign: "center",
          opacity: sub * 0.95,
          transform: `translateY(${(1 - sub) * 18}px)`,
        }}
      >
        Confusion छ? यहाँ हेर्नुहोस्।
      </div>
    </AbsoluteFill>
  );
};
