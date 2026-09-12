import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ART, HP, SAFE } from "../brand";
import { sans } from "../../fonts";
import { Panda } from "../components/Panda";

/** The site publishes its approval rates and its price list. Say that. */
const LINES = ["Published,", "not promised."];

/** The turn: what separates this site from the one next door. */
export const OnePlace: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
            frame: frame - i * 5,
            fps,
            config: { damping: 14, stiffness: 160, mass: 0.6 },
            durationInFrames: 28,
          });
          return (
            <div
              key={line}
              style={{
                fontFamily: sans,
                fontWeight: 800,
                fontSize: 124,
                lineHeight: 1.02,
                letterSpacing: "-0.04em",
                color: i === LINES.length - 1 ? HP.bright : HP.white,
                opacity: interpolate(enter, [0, 0.3], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `translateY(${(1 - enter) * 40}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 26 }}>
        <Panda src={ART.namaste} width={700} at={8} rise={120} />
      </div>
    </AbsoluteFill>
  );
};
