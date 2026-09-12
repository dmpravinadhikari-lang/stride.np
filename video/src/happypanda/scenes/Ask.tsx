import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ART, HP, SAFE, rgba } from "../brand";
import { sans } from "../../fonts";
import { Panda } from "../components/Panda";

/** The three the site is built to answer, in the order it answers them. */
const QUESTIONS = ["Which country?", "What are my odds?", "What will it cost?"];
const PER = 26;

export const Ask: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const index = Math.min(QUESTIONS.length - 1, Math.floor(frame / PER));
  const local = frame - index * PER;
  const flip = spring({
    frame: local,
    fps,
    config: { damping: 15, stiffness: 200, mass: 0.5 },
    durationInFrames: 20,
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
          color: rgba.white(0.72),
        }}
      >
        EVERY STUDENT ASKS
      </div>

      <div
        style={{
          marginTop: 46,
          height: 210,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 84,
            lineHeight: 1.06,
            letterSpacing: "-0.035em",
            color: HP.white,
            textAlign: "center",
            opacity: interpolate(flip, [0, 0.35], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `translateY(${(1 - flip) * 34}px) rotate(${(1 - flip) * -2}deg)`,
          }}
        >
          {QUESTIONS[index]}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <Panda src={ART.thinking} width={880} at={4} tilt={2} rise={110} />
      </div>
    </AbsoluteFill>
  );
};
