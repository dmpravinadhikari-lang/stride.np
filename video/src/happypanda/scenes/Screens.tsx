import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { HP, SAFE, rgba } from "../brand";
import { sans } from "../../fonts";
import { Phone } from "../components/Phone";

/**
 * The site itself.
 *
 * Order is the order a student meets it: their own login, then the CV Maker,
 * which is the thing they can use today without asking anyone for anything,
 * then what is behind the login, then the rest of the free tools.
 *
 * The document vault is deliberately not here. It is a good screen on a file
 * that has documents in it, and a screen of zeros on one that does not.
 */
const SCREENS = [
  { shot: "happypanda/shots/login.png", caption: "Your own login" },
  { shot: "happypanda/shots/cv-maker.png", caption: "CV Maker, free to use" },
  { shot: "happypanda/shots/app-dashboard.png", caption: "Your file, always open" },
  { shot: "happypanda/shots/app-checklist.png", caption: "Every step, dated" },
  { shot: "happypanda/shots/app-cost.png", caption: "The real cost, in rupees" },
  { shot: "happypanda/shots/app-mock-tests.png", caption: "IELTS mocks, marked" },
  { shot: "happypanda/shots/tools-1.png", caption: "Eight more free tools" },
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
