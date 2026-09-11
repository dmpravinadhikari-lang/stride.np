import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, RADIUS, rgba } from "../brand";
import { display, sans } from "../fonts";

/**
 * Four of the things the platform actually does, taken from what is built
 * rather than from adjectives. Cards enter staggered so the eye is given one
 * at a time instead of a wall.
 */
const CARDS = [
  {
    index: "01",
    title: "SOP Studio",
    line: "Statements drafted with the student, then checked line by line",
  },
  {
    index: "02",
    title: "IELTS mock tests",
    line: "Timed sections, marked the moment the student finishes",
  },
  {
    index: "03",
    title: "True cost calculator",
    line: "The whole thing in rupees, and the balance each country wants shown",
  },
  {
    index: "04",
    title: "Document vault",
    line: "32 document types for Nepal, verified by the consultancy",
  },
];

export const Capabilities: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heading = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });

  return (
    <div style={{ width: 1440 }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: "0.3em",
          color: C.signature,
          opacity: heading,
          transform: `translateY(${(1 - heading) * 12}px)`,
          marginBottom: 40,
        }}
      >
        WHAT IT DOES
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
        }}
      >
        {CARDS.map((card, i) => {
          const enter = spring({
            frame: frame - 10 - i * 9,
            fps,
            config: { damping: 200, mass: 0.8 },
            durationInFrames: 30,
          });
          return (
            <div
              key={card.index}
              style={{
                borderRadius: RADIUS,
                border: `1px solid ${rgba.wash(0.13)}`,
                background: `linear-gradient(150deg, ${rgba.deep(0.42)}, ${rgba.deep(0.16)})`,
                padding: "38px 40px 42px",
                opacity: enter,
                transform: `translateY(${(1 - enter) * 34}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 600,
                  fontSize: 20,
                  letterSpacing: "0.22em",
                  color: C.signature,
                }}
              >
                {card.index}
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 46,
                  letterSpacing: "-0.02em",
                  color: C.white,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontFamily: sans,
                  fontWeight: 400,
                  fontSize: 25,
                  lineHeight: 1.45,
                  color: C.wash,
                  opacity: 0.74,
                  // Held back a beat behind the card it sits in.
                  transform: `translateY(${interpolate(enter, [0, 1], [8, 0])}px)`,
                }}
              >
                {card.line}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
