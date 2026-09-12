import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE, SH } from "../brand";
import { nepali } from "../../fonts";
import { Icon } from "../components/icons";

const LINES = ["सबै कुरा,", "एकै ठाउँमा।"];

/** The turn: everything the reel just showed, said once. */
export const Turn: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mark = spring({
    frame: frame - 14,
    fps,
    config: { damping: 13, stiffness: 160, mass: 0.7 },
    durationInFrames: 30,
  });

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
      <div style={{ textAlign: "center" }}>
        {LINES.map((line, i) => {
          const enter = spring({
            frame: frame - i * 6,
            fps,
            config: { damping: 14, stiffness: 160, mass: 0.6 },
            durationInFrames: 30,
          });
          return (
            <div
              key={line}
              style={{
                fontFamily: nepali,
                fontWeight: 800,
                fontSize: 120,
                lineHeight: 1.3,
                color: i === LINES.length - 1 ? SH.gold : SH.white,
                opacity: interpolate(enter, [0, 0.3], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `translateY(${(1 - enter) * 42}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      {/* The roof frame, which is the moment a house starts looking like one. */}
      <div
        style={{
          marginTop: 56,
          opacity: mark,
          transform: `translateY(${(1 - mark) * 30}px) scale(${interpolate(mark, [0, 1], [0.86, 1])})`,
        }}
      >
        <Icon name="truss" size={320} color={SH.gold} />
      </div>
    </AbsoluteFill>
  );
};
