import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../components/Scene";
import { Soundtrack } from "../components/Soundtrack";
import { VoiceLines } from "../components/VoiceLines";
import { VOICEOVER_READY, VO_LINES } from "./script";
import { geometric } from "../fonts";
import { AL, SAFE, rgba } from "./brand";
import { Backdrop } from "./components/Backdrop";
import { Frame } from "./components/Frame";
import { Head, Kicker, Nepali, Rise, Rule, Say } from "./components/Type";
import { Dish } from "./scenes/Dish";
import { AlevProps, layout } from "./schema";

export const REEL_FPS = 30;

/**
 * Alev Kebab Sultanate — Instagram reel.
 *
 * The angle is the one their own gallery keeps handing you: nobody eats here
 * alone. Every picture on their site is a table of eight with a metre of
 * kebab down the middle of it, so the reel opens on the thing that does not
 * fit on a plate, names the dishes built for sharing, and then shows who they
 * are for. The address is the payoff, not the opening.
 *
 * Every word, photograph and duration arrives as a prop, so the whole thing is
 * editable from the form in Remotion Studio without opening this file.
 */

/** Text never leaves the safe area; the pictures may. */
const Stage: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 0 }) => (
  <AbsoluteFill
    style={{
      paddingTop: SAFE.top,
      paddingBottom: SAFE.bottom,
      paddingLeft: SAFE.side,
      paddingRight: SAFE.side,
      alignItems: "center",
      justifyContent: "center",
      gap,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** The hook: the signature dish, full bleed, because it is the argument. */
const Hook: React.FC<Pick<AlevProps, "hookTop" | "hookBottom" | "hookPhoto" | "kicker">> = ({
  hookTop,
  hookBottom,
  hookPhoto,
  kicker,
}) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 84], [1.04, 1.14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(hookPhoto)}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
        />
      </AbsoluteFill>
      {/* A scrim, heavy at the top where the words go. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(18,13,12,0.92) 0%, rgba(18,13,12,0.55) 38%, rgba(18,13,12,0.25) 60%, rgba(18,13,12,0.9) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          paddingTop: SAFE.top,
          paddingBottom: SAFE.bottom,
          paddingLeft: SAFE.side,
          paddingRight: SAFE.side,
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "center",
        }}
      >
        <Rise>
          <Head size={96}>
            {hookTop}
            <br />
            {hookBottom}
          </Head>
        </Rise>
        <Rise delay={10}>
          <Kicker>{kicker}</Kicker>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Who the big platters are actually for. */
const Table: React.FC<
  Pick<AlevProps, "tableTop" | "tableBottom" | "tablePhoto" | "nepaliLine" | "gold">
> = ({ tableTop, tableBottom, tablePhoto, nepaliLine, gold }) => (
  <Stage gap={40}>
    <Rise>
      <Head size={92}>
        {tableTop}
        <br />
        <span style={{ color: gold }}>{tableBottom}</span>
      </Head>
    </Rise>
    <Rise delay={8} up={34}>
      <Frame src={tablePhoto} w={912} h={600} shape="band" over={100} drift={0.08} />
    </Rise>
    <Rise delay={15}>
      <Nepali>{nepaliLine}</Nepali>
    </Rise>
  </Stage>
);

/** Everything that arrives before the grill does. */
const Spread: React.FC<Pick<AlevProps, "spreadTitle" | "spreadPhotos" | "spreadKicker">> = ({
  spreadTitle,
  spreadPhotos,
  spreadKicker,
}) => (
  <Stage gap={44}>
    <Rise>
      <div style={{ textAlign: "center" }}>
        <Head size={84}>{spreadTitle}</Head>
      </div>
    </Rise>
    <div style={{ display: "grid", gridTemplateColumns: "436px 436px", gap: 40 }}>
      {spreadPhotos.slice(0, 4).map((src, i) => (
        <Rise key={src + i} delay={6 + i * 4} up={22}>
          <Frame src={src} w={436} h={436} shape="square" over={94} drift={0.09} />
        </Rise>
      ))}
    </div>
    <Rise delay={24}>
      <Kicker>{spreadKicker}</Kicker>
    </Rise>
  </Stage>
);

/** What people actually come in for. */
const Occasion: React.FC<Pick<AlevProps, "occasionPhoto" | "occasionWords" | "gold">> = ({
  occasionPhoto,
  occasionWords,
  gold,
}) => (
  <Stage gap={44}>
    <Rise up={34}>
      <Frame src={occasionPhoto} w={912} h={720} shape="band" over={78} drift={0.12} />
    </Rise>
    <div style={{ textAlign: "center" }}>
      {occasionWords.map((word, i) => (
        <Rise key={word + i} delay={6 + i * 7} up={18}>
          <Head size={78} colour={i === occasionWords.length - 1 ? gold : AL.cream}>
            {word}
          </Head>
        </Rise>
      ))}
    </div>
  </Stage>
);

/** The card: who, where, when, and how to get a table. */
const Close: React.FC<Pick<AlevProps, "logo" | "where" | "hours" | "phone" | "site" | "gold">> = ({
  logo,
  where,
  hours,
  phone,
  site,
  gold,
}) => (
  <Stage gap={0}>
    <Rise up={30}>
      <Img src={staticFile(logo)} style={{ width: 640, display: "block" }} />
    </Rise>
    <div style={{ marginTop: 10 }}>
      <Rise delay={8}>
        <Rule width={330} />
      </Rise>
    </div>
    <div style={{ marginTop: 26, textAlign: "center" }}>
      <Rise delay={12}>
        <Head size={54}>{where}</Head>
        <div style={{ marginTop: 14 }}>
          <Say size={38}>{hours}</Say>
        </div>
      </Rise>
    </div>
    <div style={{ marginTop: 34, display: "flex", gap: 18, alignItems: "center" }}>
      <Rise delay={18}>
        <div
          style={{
            fontFamily: geometric,
            fontWeight: 500,
            fontSize: 40,
            letterSpacing: "0.06em",
            color: AL.char,
            background: gold,
            padding: "16px 38px",
            borderRadius: 999,
          }}
        >
          {phone}
        </div>
      </Rise>
      <Rise delay={22}>
        <div
          style={{
            fontFamily: geometric,
            fontWeight: 500,
            fontSize: 40,
            letterSpacing: "0.06em",
            color: AL.goldPale,
            border: `2px solid ${rgba.gold(0.55)}`,
            padding: "14px 34px",
            borderRadius: 999,
          }}
        >
          {site}
        </div>
      </Rise>
    </div>
  </Stage>
);

export const AlevReel: React.FC<AlevProps> = (props) => {
  const { fps } = useVideoConfig();
  const { cues } = layout(props.timing, props.dishes.length, fps);
  // One cue per scene, in the order they are laid out above.
  const [hookCue, ...rest] = cues;
  const dishCues = rest.slice(0, props.dishes.length);
  const [tableCue, spreadCue, occasionCue, closeCue] = rest.slice(props.dishes.length);

  return (
    <AbsoluteFill style={{ backgroundColor: AL.char, fontFamily: geometric }}>
      <Soundtrack music={props.music} voice={props.voice} narrated={VOICEOVER_READY} />
      <VoiceLines lines={VO_LINES} dir="alev/vo" ready={VOICEOVER_READY} />
      <Backdrop ember={props.ember} gold={props.gold} />

      <Scene {...hookCue} fadeIn={5} fadeOut={6}>
        <Hook {...props} />
      </Scene>

      {props.dishes.map((dish, i) => (
        <Scene key={dish.name + i} {...dishCues[i]} fadeIn={5} fadeOut={6}>
          <Dish {...dish} gold={props.gold} />
        </Scene>
      ))}

      <Scene {...tableCue} fadeIn={5} fadeOut={6}>
        <Table {...props} />
      </Scene>
      <Scene {...spreadCue} fadeIn={5} fadeOut={6}>
        <Spread {...props} />
      </Scene>
      <Scene {...occasionCue} fadeIn={5} fadeOut={6}>
        <Occasion {...props} />
      </Scene>
      <Scene {...closeCue} fadeIn={6} fadeOut={0}>
        <Close {...props} />
      </Scene>
    </AbsoluteFill>
  );
};
