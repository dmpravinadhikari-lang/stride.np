import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { HP, SAFE, rgba } from "../brand";
import { sans } from "../../fonts";
import { Phone } from "../components/Phone";

/**
 * The site itself — www.happypandaeducation.com, captured from the live pages
 * in `public/happypanda/live/`, not from anything that only exists locally.
 *
 * Order is the order the site itself argues in: here are five countries, here
 * is what each is actually approving, here is one of them told straight, then
 * the two things you can use today without asking anyone, then how the work
 * runs and what it costs.
 */
const SCREENS = [
  { shot: "happypanda/live/home.png", caption: "Five countries, real odds" },
  { shot: "happypanda/live/destinations.png", caption: "Approval rates, country by country" },
  { shot: "happypanda/live/australia.png", caption: "Told straight, even when it's bad" },
  { shot: "happypanda/live/cv-maker.png", caption: "Free CV maker, no account" },
  { shot: "happypanda/live/loan.png", caption: "What the loan really costs" },
  { shot: "happypanda/live/process.png", caption: "Seven steps, always know which" },
  { shot: "happypanda/live/fees.png", caption: "Every fee, published" },
];

/** A second and a half each — long enough to read the caption and the screen. */
export const PER_SCREEN = 45;
export const SCREENS_DURATION = SCREENS.length * PER_SCREEN;

export const Screens: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const index = Math.min(SCREENS.length - 1, Math.floor(frame / PER_SCREEN));
  const local = frame - index * PER_SCREEN;
  const screen = SCREENS[index];

  // Each cut lands with a small knock rather than a dissolve, which is what
  // keeps six screens in six seconds feeling deliberate instead of rushed.
  const knock = spring({
    frame: local,
    fps,
    config: { damping: 16, stiffness: 220, mass: 0.5 },
    durationInFrames: 18,
  });

  const caption = spring({
    frame: local - 2,
    fps,
    config: { damping: 18, stiffness: 200, mass: 0.5 },
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
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "16px 34px",
          borderRadius: 999,
          background: HP.white,
          color: HP.brand,
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 36,
          letterSpacing: "-0.015em",
          boxShadow: `0 14px 34px -14px rgba(6, 26, 40, 0.6)`,
          opacity: interpolate(caption, [0, 0.4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${(1 - caption) * 18}px)`,
        }}
      >
        {screen.caption}
      </div>

      {/* Counts the screens off, so the run reads as a set with an end. */}
      <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
        {SCREENS.map((s, i) => (
          <div
            key={s.shot}
            style={{
              width: i === index ? 34 : 10,
              height: 10,
              borderRadius: 999,
              background: i === index ? HP.white : rgba.white(0.36),
            }}
          />
        ))}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 26,
        }}
      >
        <div
          style={{
            opacity: interpolate(knock, [0, 0.3], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `translateY(${(1 - knock) * 30}px)`,
          }}
        >
          <Phone src={screen.shot} scale={interpolate(knock, [0, 1], [1.04, 1])} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
