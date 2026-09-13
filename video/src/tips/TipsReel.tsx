import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ART, SAFE, SH, rgba } from "../shilakshya/brand";
import { nepali } from "../fonts";
import { Scene } from "../components/Scene";
import { Soundtrack } from "../components/Soundtrack";
import { VoiceLines } from "../components/VoiceLines";
import { VOICEOVER_READY, VO_LINES } from "./script";
import { Backdrop } from "./components/Backdrop";
import { TipCard } from "./scenes/TipCard";
import { TipsProps, layout } from "./schema";

export const REEL_FPS = 30;


/** The sky walks forward a step per tip, driven by the tips' own cues. */
const SkyLayer: React.FC<{ cues: { from: number; duration: number }[] }> = ({ cues }) => {
  const frame = useCurrentFrame();

  // How many tips have opened by now, and how far through the current one we
  // are. Reading the cues rather than a step size keeps the sky in step when
  // the tips are re-timed from the form.
  const stage = cues.filter((c) => frame >= c.from).length;
  const current = cues[stage - 1];
  const blend = current
    ? Math.min(1, Math.max(0, (frame - current.from) / current.duration))
    : 0;

  return <Backdrop stage={stage} blend={blend} />;
};

const Hook: React.FC<Pick<TipsProps, "hookTop" | "hookBig" | "hookUnder">> = ({
  hookTop,
  hookBig,
  hookUnder,
}) => {
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
        {hookTop}
      </div>
      <div
        style={{
          fontFamily: nepali,
          fontWeight: 800,
          fontSize: 186,
          lineHeight: 1.2,
          color: SH.gold,
          textShadow: "0 8px 30px rgba(6, 18, 30, 0.5)",
          opacity: interpolate(b, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - b) * 40}px)`,
        }}
      >
        {hookBig}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: nepali,
          fontWeight: 700,
          fontSize: 54,
          color: "rgba(255,255,255,0.9)",
          textShadow: "0 5px 22px rgba(6, 18, 30, 0.5)",
          opacity: b,
        }}
      >
        {hookUnder}
      </div>
    </div>
  );
};

const Close: React.FC<Pick<TipsProps, "closeAsk" | "closeSite" | "closeButton">> = ({
  closeAsk,
  closeSite,
  closeButton,
}) => {
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
        {closeAsk}
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
        {closeSite}
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
        {closeButton}
      </div>
    </div>
  );
};

/** Cards sit in the top half; the house is always underneath them. */
const Top: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      paddingTop: SAFE.top,
      paddingBottom: SAFE.bottom,
      paddingLeft: SAFE.side,
      paddingRight: SAFE.side,
      alignItems: "center",
      // Centred in the safe area: with the sheet doing the explaining there is
      // nothing below it to balance against.
      justifyContent: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);

export const TipsReel: React.FC<TipsProps> = (props) => {
  const { fps } = useVideoConfig();
  const { cues } = layout(props.timing, props.tips.length, fps);
  const [hookCue, ...rest] = cues;
  const tipCues = rest.slice(0, props.tips.length);
  const closeCue = rest[props.tips.length];

  return (
    <AbsoluteFill style={{ backgroundColor: SH.deep, fontFamily: nepali }}>
      <Soundtrack music={props.music} voice={props.voice} narrated={VOICEOVER_READY} />
      <VoiceLines lines={VO_LINES} dir="tips/vo" ready={VOICEOVER_READY} />
      <SkyLayer cues={tipCues} />

      <Scene {...hookCue} fadeIn={4} fadeOut={5}>
        <Top>
          <Hook {...props} />
        </Top>
      </Scene>

      {props.tips.map((tip, i) => (
        <Scene key={tip.title + i} {...tipCues[i]} fadeIn={4} fadeOut={5}>
          <Top>
            <TipCard tip={tip} />
          </Top>
        </Scene>
      ))}

      <Scene {...closeCue} fadeIn={5} fadeOut={0}>
        <Top>
          <Close {...props} />
        </Top>
      </Scene>
    </AbsoluteFill>
  );
};
