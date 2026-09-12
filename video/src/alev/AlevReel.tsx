import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Scene } from "../components/Scene";
import { geometric } from "../fonts";
import { AL, ART, AUDIO, PLACE, SAFE, rgba } from "./brand";
import { Backdrop } from "./components/Backdrop";
import { Frame } from "./components/Frame";
import { Head, Kicker, Nepali, Rise, Rule, Say } from "./components/Type";
import { Dish } from "./scenes/Dish";

export const REEL_FPS = 30;
export const REEL_DURATION = 600; // 20.0s

/**
 * Alev Kebab Sultanate — Instagram reel.
 *
 * The angle is the one their own gallery keeps handing you: nobody eats here
 * alone. Every picture on their site is a table of eight with a metre of
 * kebab down the middle of it, so the reel opens on the thing that does not
 * fit on a plate, names the three dishes built for sharing, and then shows
 * who they are for. The address is the payoff, not the opening.
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

/** The hook: the long kebab, full bleed, because the dish is the argument. */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 84], [1.04, 1.14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(ART.longestKebab)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom})`,
          }}
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
            This doesn&rsquo;t fit
            <br />
            on a plate
          </Head>
        </Rise>
        <Rise delay={10}>
          <Kicker>Alev Kebab Sultanate &middot; Naxal</Kicker>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Who the big platters are actually for. */
const Table: React.FC = () => (
  <Stage gap={40}>
    <Rise>
      <Head size={92}>
        Tables of 4.
        <br />
        <span style={{ color: AL.gold }}>Tables of 14.</span>
      </Head>
    </Rise>
    <Rise delay={8} up={34}>
      <Frame src={ART.tableNight} w={912} h={600} shape="band" over={100} drift={0.08} />
    </Rise>
    <Rise delay={15}>
      <Nepali>साथीभाइ जम्मा गर्नुहोस्।</Nepali>
    </Rise>
  </Stage>
);

/** Everything that arrives before the grill does. */
const Spread: React.FC = () => {
  const tiles = [ART.mezze, ART.falafel, ART.salad, ART.mixedGrill];
  return (
    <Stage gap={44}>
      <Rise>
        <div style={{ textAlign: "center" }}>
          <Head size={84}>And everything before it</Head>
        </div>
      </Rise>
      <div style={{ display: "grid", gridTemplateColumns: "436px 436px", gap: 40 }}>
        {tiles.map((src, i) => (
          <Rise key={src} delay={6 + i * 4} up={22}>
            <Frame src={src} w={436} h={436} shape="square" over={94} drift={0.09} />
          </Rise>
        ))}
      </div>
      <Rise delay={24}>
        <Kicker>Meze · Falafel · Salatasi</Kicker>
      </Rise>
    </Stage>
  );
};

/** What people actually come in for. */
const Occasion: React.FC = () => (
  <Stage gap={44}>
    <Rise up={34}>
      <Frame src={ART.celebration} w={912} h={720} shape="band" over={78} drift={0.12} />
    </Rise>
    <div style={{ textAlign: "center" }}>
      {["Birthdays.", "Anniversaries.", "Tuesdays."].map((word, i) => (
        <Rise key={word} delay={6 + i * 7} up={18}>
          <Head size={78} colour={i === 2 ? AL.gold : AL.cream}>
            {word}
          </Head>
        </Rise>
      ))}
    </div>
  </Stage>
);

/** The card: who, where, when, and how to get a table. */
const Close: React.FC = () => (
  <Stage gap={0}>
    <Rise up={30}>
      <Img src={staticFile(ART.logo)} style={{ width: 640, display: "block" }} />
    </Rise>
    <div style={{ marginTop: 10 }}>
      <Rise delay={8}>
        <Rule width={330} />
      </Rise>
    </div>
    <div style={{ marginTop: 26, textAlign: "center" }}>
      <Rise delay={12}>
        <Head size={54}>{PLACE.where}</Head>
        <div style={{ marginTop: 14 }}>
          <Say size={38}>{PLACE.hours}</Say>
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
            background: AL.gold,
            padding: "16px 38px",
            borderRadius: 999,
          }}
        >
          {PLACE.phone}
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
          {PLACE.site}
        </div>
      </Rise>
    </div>
  </Stage>
);

export const AlevReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: AL.char, fontFamily: geometric }}>
    {AUDIO ? <Audio src={staticFile(AUDIO)} volume={0.4} /> : null}
    <Backdrop />

    <Scene from={0} duration={84} fadeIn={5} fadeOut={6}>
      <Hook />
    </Scene>

    <Scene from={78} duration={66} fadeIn={5} fadeOut={6}>
      <Dish
        src={ART.longestKebab}
        name="Longest Kebab"
        say="Mutton Adana and minced mutton, end to end."
        shape="band"
      />
    </Scene>
    <Scene from={136} duration={66} fadeIn={5} fadeOut={6}>
      <Dish
        src={ART.sultansGrill}
        name="Sultan&rsquo;s Grill"
        say="Chicken Adana, chicken sis and wings."
      />
    </Scene>
    <Scene from={194} duration={66} fadeIn={5} fadeOut={6}>
      <Dish
        src={ART.skewerTower}
        name="Grilled Meat Platter"
        say="Pilau, dill and saffron rice, under the skewers."
      />
    </Scene>

    <Scene from={254} duration={102} fadeIn={5} fadeOut={6}>
      <Table />
    </Scene>
    <Scene from={350} duration={96} fadeIn={5} fadeOut={6}>
      <Spread />
    </Scene>
    <Scene from={440} duration={78} fadeIn={5} fadeOut={6}>
      <Occasion />
    </Scene>
    <Scene from={512} duration={88} fadeIn={6} fadeOut={0}>
      <Close />
    </Scene>
  </AbsoluteFill>
);
