import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ART, AUDIO, SAFE, SH, SITE, rgba } from "../shilakshya/brand";
import { nepali } from "../fonts";
import { Scene } from "../components/Scene";
import { Backdrop } from "./components/Backdrop";
import { HouseBuild } from "./components/HouseBuild";
import { TipCard } from "./scenes/TipCard";
import { TIPS } from "./copy";

export const REEL_FPS = 30;

/** Fast: a tip lands every two and four fifths seconds. */
const HOOK = { from: 0, duration: 72 };
const TIPS_FROM = 66;
const PER_TIP = 84;
const CLOSE = { from: TIPS_FROM + TIPS.length * PER_TIP - 6, duration: 96 };

export const REEL_DURATION = CLOSE.from + CLOSE.duration; // 576 frames, 19.2s

/**
 * The house is drawn outside the scenes, on its own clock, so it keeps
 * building straight through every cut instead of restarting with each card.
 */
const HouseLayer: React.FC = () => {
  const frame = useCurrentFrame();

  const raw = Math.floor((frame - TIPS_FROM) / PER_TIP) + 1;
  const stage = Math.min(TIPS.length, Math.max(0, raw));
  // Past the last tip, pin the clock forward so the finished house stays
  // finished rather than springing its last pieces in again.
  const frameInStage = raw > TIPS.length ? 999 : Math.max(0, (frame - TIPS_FROM) % PER_TIP);

  return (
    <>
      <Backdrop stage={stage} blend={frameInStage / PER_TIP} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 200 }}>
        <HouseBuild stage={stage} frameInStage={frameInStage} width={1000} />
      </AbsoluteFill>
    </>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 14, stiffness: 160, mass: 0.6 }, durationInFrames: 26 });
  const b = spring({ frame: frame - 7, fps, config: { damping: 14, stiffness: 160, mass: 0.6 }, durationInFrames: 26 });

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: nepali,
          fontWeight: 800,
          fontSize: 86,
          lineHeight: 1.3,
          color: "#FFFFFF",
          textShadow: "0 6px 26px rgba(6, 18, 30, 0.55)",
          opacity: interpolate(a, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - a) * 34}px)`,
        }}
      >
        घर बनाउनु अघि
      </div>
      <div
        style={{
          fontFamily: nepali,
          fontWeight: 800,
          fontSize: 148,
          lineHeight: 1.24,
          color: SH.gold,
          textShadow: "0 8px 30px rgba(6, 18, 30, 0.5)",
          opacity: interpolate(b, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - b) * 40}px)`,
        }}
      >
        ५ कुरा
      </div>
    </div>
  );
};

const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 150, mass: 0.7 }, durationInFrames: 30 });
  const line = spring({ frame: frame - 20, fps, config: { damping: 200 }, durationInFrames: 24 });

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: nepali,
          fontWeight: 800,
          fontSize: 66,
          lineHeight: 1.3,
          color: "#FFFFFF",
          textShadow: "0 6px 24px rgba(6, 18, 30, 0.55)",
          opacity: interpolate(mark, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - mark) * 26}px)`,
        }}
      >
        घर बनाउने सोच्दै?
      </div>
      <Img
        src={staticFile(ART.logoWhite)}
        style={{
          width: 520,
          marginTop: 26,
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
          opacity: line,
          transform: `translateY(${(1 - line) * 20}px)`,
        }}
      />
      <div
        style={{
          marginTop: 18,
          fontFamily: nepali,
          fontWeight: 800,
          fontSize: 54,
          color: SH.gold,
          opacity: line,
        }}
      >
        {SITE}
      </div>
      <div
        style={{
          marginTop: 20,
          display: "inline-block",
          padding: "12px 32px",
          borderRadius: 999,
          border: `2px solid ${rgba.white(0.5)}`,
          fontFamily: nepali,
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: "0.2em",
          color: rgba.white(0.94),
          opacity: line,
        }}
      >
        LINK IN BIO
      </div>
    </div>
  );
};

/** Cards sit in the top half; the house is always underneath them. */
const Top: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      paddingTop: SAFE.top,
      paddingLeft: SAFE.side,
      paddingRight: SAFE.side,
      alignItems: "center",
      justifyContent: "flex-start",
    }}
  >
    {children}
  </AbsoluteFill>
);

export const TipsReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: SH.deep, fontFamily: nepali }}>
    {AUDIO ? <Audio src={staticFile(AUDIO)} volume={0.35} /> : null}
    <HouseLayer />

    <Scene {...HOOK} fadeIn={4} fadeOut={5}>
      <Top>
        <Hook />
      </Top>
    </Scene>

    {TIPS.map((tip, i) => (
      <Scene
        key={tip.n}
        from={TIPS_FROM + i * PER_TIP}
        duration={PER_TIP + 4}
        fadeIn={4}
        fadeOut={5}
      >
        <Top>
          <TipCard tip={tip} />
        </Top>
      </Scene>
    ))}

    <Scene {...CLOSE} fadeIn={5} fadeOut={0}>
      <Top>
        <Close />
      </Top>
    </Scene>
  </AbsoluteFill>
);
