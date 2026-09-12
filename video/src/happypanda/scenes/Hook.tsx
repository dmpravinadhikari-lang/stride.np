import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ART, HP, SAFE, rgba } from "../brand";
import { sans } from "../../fonts";
import { Panda } from "../components/Panda";

const LINES = ["OUR NEW", "WEBSITE", "IS LIVE"];

/** The hook. Three words, one panda, over in two and a half seconds. */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrow = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 14,
  });

  // The rule under "IS LIVE" is swiped on after the last line has landed.
  const swipe = spring({
    frame: frame - 30,
    fps,
    config: { damping: 200 },
    durationInFrames: 18,
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
      <div
        style={{
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 29,
          letterSpacing: "0.24em",
          color: rgba.white(0.82),
          textAlign: "center",
          opacity: eyebrow,
          transform: `translateY(${(1 - eyebrow) * 14}px)`,
        }}
      >
        HAPPY PANDA EDUCATION
      </div>

      <div style={{ marginTop: 42, textAlign: "center" }}>
        {LINES.map((line, i) => {
          const enter = spring({
            frame: frame - 6 - i * 5,
            fps,
            config: { damping: 14, stiffness: 150, mass: 0.6 },
            durationInFrames: 30,
          });
          return (
            <div
              key={line}
              style={{
                position: "relative",
                fontFamily: sans,
                fontWeight: 800,
                fontSize: 150,
                lineHeight: 0.98,
                letterSpacing: "-0.045em",
                color: HP.white,
                opacity: interpolate(enter, [0, 0.3], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `translateY(${(1 - enter) * 46}px)`,
              }}
            >
              {line}
              {i === LINES.length - 1 ? (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: -14,
                    width: `${swipe * 76}%`,
                    height: 12,
                    borderRadius: 999,
                    background: HP.bright,
                    transform: "translateX(-50%)",
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 34 }}>
        <Panda src={ART.ticket} width={740} at={14} tilt={-3} rise={140} />
      </div>
    </AbsoluteFill>
  );
};
