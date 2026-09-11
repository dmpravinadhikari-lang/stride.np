import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, rgba } from "../brand";
import { display, sans } from "../fonts";

/**
 * The journey a Nepali student actually goes through, in order — the same
 * stages the pipeline moves them through in the app (`src/modules/pipeline/
 * stages.ts`), minus the "Lost" off-ramp, which is not what an intro is for.
 */
const STAGES = [
  "Enquiry",
  "Counselling",
  "Test prep",
  "Applying",
  "Offer received",
  "Visa lodged",
  "Departed",
];

const TRACK = 1520;

export const Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heading = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });

  const closing = spring({
    frame: frame - 92,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });

  // The line is drawn across the track, and each stage lights as it is reached.
  const progress = interpolate(frame, [24, 104], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width: TRACK, textAlign: "center" }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 78,
          lineHeight: 1.12,
          letterSpacing: "-0.03em",
          color: C.white,
          opacity: heading,
          transform: `translateY(${(1 - heading) * 16}px)`,
        }}
      >
        One place for the whole journey,
        <br />
        <span style={{ color: C.signature }}>enquiry to departure</span>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 92,
          height: 92,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 11,
            height: 2,
            background: rgba.wash(0.14),
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 11,
            height: 2,
            width: `${progress * 100}%`,
            background: C.signature,
          }}
        />

        {STAGES.map((stage, i) => {
          const at = i / (STAGES.length - 1);
          // A stage lights as the line arrives at it rather than all at once.
          // The ramp ends exactly on the node, so the last one is fully lit by
          // the time the line finishes rather than caught halfway.
          const lit = interpolate(progress, [at * 0.96, at * 0.96 + 0.04], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const size = interpolate(lit, [0, 1], [14, 24]);
          return (
            <div
              key={stage}
              style={{
                position: "absolute",
                left: `${at * 100}%`,
                top: 0,
                transform: "translateX(-50%)",
                width: 220,
              }}
            >
              <div
                style={{
                  width: size,
                  height: size,
                  margin: `${12 - size / 2}px auto 0`,
                  borderRadius: "50%",
                  background: lit > 0 ? C.signature : C.ground,
                  border: `2px solid ${lit > 0 ? C.signature : rgba.wash(0.3)}`,
                  boxShadow: lit > 0 ? `0 0 ${lit * 26}px ${rgba.signature(0.65)}` : "none",
                }}
              />
              <div
                style={{
                  marginTop: 26,
                  fontFamily: sans,
                  fontWeight: 500,
                  fontSize: 24,
                  letterSpacing: "-0.01em",
                  color: lit > 0.5 ? C.wash : rgba.wash(0.42),
                  opacity: interpolate(lit, [0, 1], [0.45, 1]),
                }}
              >
                {stage}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 52,
          fontFamily: sans,
          fontWeight: 400,
          fontSize: 30,
          letterSpacing: "-0.01em",
          color: C.wash,
          opacity: closing * 0.68,
          transform: `translateY(${(1 - closing) * 14}px)`,
        }}
      >
        The consultancy and the student working from one record.
      </div>
    </div>
  );
};
