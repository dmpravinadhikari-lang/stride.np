import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ArtName } from "../schema";

/**
 * One technical sheet per tip.
 *
 * Drawn the way a drawing is drawn — navy linework on a cream sheet, one
 * dimension, one thing marked in the tip's colour. Their own photographs are
 * all finished interiors, which say nothing about a soil test or a setback, so
 * the sheet does the explaining instead of decorating around it.
 */
const SHEET = "#F4F0E6";
const INK = "#152A43";
const MUTED = "#8A8272";
const RED = "#C2403A";

type ArtProps = { c: string; t: number };

/** Ground layers, a borehole, and the depth it was taken from. */
const Soil: React.FC<ArtProps> = ({ c, t }) => (
  <>
    <rect x="30" y="96" width="340" height="34" fill="#B99B6E" />
    <rect x="30" y="130" width="340" height="40" fill="#A98756" />
    <rect x="30" y="170" width="340" height="44" fill="#8C7350" />
    <rect x="30" y="214" width="340" height="38" fill="#6E6152" />
    <g fontSize="13" fontFamily="monospace" fill={INK}>
      <text x="286" y="118">topsoil</text>
      <text x="286" y="156">clay</text>
      <text x="286" y="198">gravel</text>
      <text x="286" y="240">rock</text>
    </g>
    {/* The bore, going down as the sheet is read. */}
    <rect x="96" y="96" width="22" height={interpolate(t, [0, 1], [0, 156])} fill={SHEET} stroke={INK} strokeWidth="2" />
    <rect x="100" y={60 + interpolate(t, [0, 1], [0, 150])} width="14" height="42" fill={c} />
    <path d="M92 96 L122 96" stroke={INK} strokeWidth="3" />
    <g opacity={interpolate(t, [0.55, 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
      <path d="M150 252 L150 96" stroke={c} strokeWidth="2.5" strokeDasharray="7 6" />
      <path d="M144 102 L150 92 L156 102 Z" fill={c} />
      <path d="M144 246 L150 256 L156 246 Z" fill={c} />
      <rect x="160" y="162" width="92" height="30" rx="5" fill={c} />
      <text x="206" y="183" fontSize="17" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="monospace">
        3.0 m
      </text>
    </g>
    <text x="30" y="80" fontSize="15" fontWeight="700" fill={INK} fontFamily="monospace">SOIL TEST</text>
    <text x="30" y="272" fontSize="13" fill={MUTED} fontFamily="monospace">Rs 15,000 – 50,000</text>
  </>
);

/** A plan: the road, its centreline, the setback, and the house behind it. */
const Setback: React.FC<ArtProps> = ({ c, t }) => (
  <>
    <text x="30" y="80" fontSize="15" fontWeight="700" fill={INK} fontFamily="monospace">SETBACK · PLAN</text>

    {/* The road and its centreline — where the measurement actually starts. */}
    <rect x="30" y="200" width="340" height="58" fill="#BDB6A6" />
    <path d="M30 231 H370" stroke={SHEET} strokeWidth="4" strokeDasharray="22 16" />
    <text x="36" y="252" fontSize="13" fill={INK} fontFamily="monospace">ROAD</text>

    {/* The boundary sits on the road edge; the house stands back behind it. */}
    <path d="M30 200 H370" stroke={INK} strokeWidth="3" />
    <rect x="112" y="98" width="196" height="74" fill="#DCD5C2" stroke={INK} strokeWidth="2" />
    <text x="210" y="142" fontSize="16" fontWeight="700" fill={INK} textAnchor="middle" fontFamily="monospace">
      घर
    </text>
    <path d="M30 172 H370" stroke={INK} strokeWidth="2" strokeDasharray="8 7" />

    {/* Right: centreline to the building face. That is the dimension. */}
    <g opacity={interpolate(t, [0.2, 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
      <path d="M344 231 L344 172" stroke={c} strokeWidth="3" />
      <path d="M338 178 L344 168 L350 178 Z" fill={c} />
      <path d="M338 225 L344 235 L350 225 Z" fill={c} />
      <rect x="248" y="187" width="80" height="28" rx="5" fill={c} />
      <text x="288" y="207" fontSize="15" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="monospace">
        min 3 m
      </text>
    </g>

    {/* Left: the measurement everyone takes instead, struck out. */}
    <g opacity={interpolate(t, [0.6, 0.95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
      <path d="M66 200 L66 172" stroke={RED} strokeWidth="3" />
      <path d="M60 178 L66 168 L72 178 Z" fill={RED} />
      <path d="M60 194 L66 204 L72 194 Z" fill={RED} />
      <path d="M50 170 L82 202" stroke={RED} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M82 170 L50 202" stroke={RED} strokeWidth="4.5" strokeLinecap="round" />
      <text x="94" y="192" fontSize="12" fill={RED} fontFamily="monospace">not from here</text>
    </g>
  </>
);

/** Two documents: the permit you get, and the one nobody comes back for. */
const Certificate: React.FC<ArtProps> = ({ c, t }) => (
  <>
    <g opacity="0.55">
      <rect x="44" y="92" width="130" height="164" rx="5" fill="#E6E0D0" stroke={INK} strokeWidth="2" />
      <rect x="62" y="116" width="94" height="7" fill={MUTED} />
      <rect x="62" y="134" width="72" height="7" fill={MUTED} />
      <rect x="62" y="152" width="88" height="7" fill={MUTED} />
      <circle cx="109" cy="206" r="26" fill="none" stroke="#5E8F62" strokeWidth="4" />
      <path d="M97 206 l9 10 20 -22" stroke="#5E8F62" strokeWidth="5" fill="none" strokeLinecap="round" />
      <text x="109" y="250" fontSize="12" fill={INK} textAnchor="middle" fontFamily="monospace">नक्सा पास</text>
    </g>

    <rect x="226" y="92" width="130" height="164" rx="5" fill={SHEET} stroke={INK} strokeWidth="2.5" />
    <rect x="244" y="116" width="94" height="7" fill={INK} />
    <rect x="244" y="134" width="72" height="7" fill={INK} />
    <rect x="244" y="152" width="88" height="7" fill={INK} />
    <g
      opacity={interpolate(t, [0.3, 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      transform={`rotate(-9 291 206) scale(${interpolate(t, [0.3, 0.6], [1.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} ${interpolate(t, [0.3, 0.6], [1.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}) translate(${interpolate(t, [0.3, 0.6], [-145, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} ${interpolate(t, [0.3, 0.6], [-103, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`}
    >
      <circle cx="291" cy="206" r="30" fill="none" stroke={c} strokeWidth="5" />
      <text x="291" y="202" fontSize="11.5" fontWeight="700" fill={c} textAnchor="middle" fontFamily="monospace">सम्पन्न</text>
      <text x="291" y="218" fontSize="11" fill={c} textAnchor="middle" fontFamily="monospace">CERT.</text>
    </g>
    <text x="291" y="272" fontSize="12" fill={INK} textAnchor="middle" fontFamily="monospace">निर्माण सम्पन्न</text>

    <path d="M182 174 H218" stroke={INK} strokeWidth="3" />
    <path d="M212 168 L222 174 L212 180 Z" fill={INK} />
    <text x="30" y="80" fontSize="15" fontWeight="700" fill={INK} fontFamily="monospace">TWO CERTIFICATES</text>
  </>
);

/** A rate with nothing behind it, against a bill of quantities that has. */
const Boq: React.FC<ArtProps> = ({ c, t }) => (
  <>
    <g opacity="0.5">
      <rect x="36" y="126" width="146" height="84" rx="5" fill="#E6E0D0" stroke={INK} strokeWidth="2" />
      <text x="109" y="164" fontSize="19" fontWeight="700" fill={INK} textAnchor="middle" fontFamily="monospace">Rs ____</text>
      <text x="109" y="188" fontSize="13" fill={MUTED} textAnchor="middle" fontFamily="monospace">per sq ft</text>
      <g opacity={interpolate(t, [0.15, 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
        <path d="M44 134 L174 202" stroke={RED} strokeWidth="4" strokeLinecap="round" />
      </g>
    </g>
    <text x="36" y="234" fontSize="12" fill={RED} fontFamily="monospace">spec छैन</text>

    <rect x="206" y="92" width="164" height="166" rx="5" fill={SHEET} stroke={INK} strokeWidth="2.5" />
    <text x="220" y="114" fontSize="13" fontWeight="700" fill={INK} fontFamily="monospace">BOQ</text>
    <path d="M214 122 H362" stroke={INK} strokeWidth="2" />
    {[
      ["Cement", "OPC 53"],
      ["Rod", "Fe500D"],
      ["Rod / column", "8 nos"],
      ["Stirrup", "@100 mm"],
      ["Brick", "Machine"],
    ].map(([k, v], i) => (
      <g
        key={k}
        opacity={interpolate(t, [0.3 + i * 0.1, 0.5 + i * 0.1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      >
        <text x="220" y={146 + i * 22} fontSize="12.5" fill={MUTED} fontFamily="monospace">{k}</text>
        <text x="356" y={146 + i * 22} fontSize="12.5" fontWeight="700" fill={c} textAnchor="end" fontFamily="monospace">
          {v}
        </text>
      </g>
    ))}
    <text x="30" y="80" fontSize="15" fontWeight="700" fill={INK} fontFamily="monospace">WHAT THE RATE HIDES</text>
  </>
);

/** Less water in the mix; more water on the slab, for fourteen days. */
const Water: React.FC<ArtProps> = ({ c, t }) => {
  const fill = interpolate(t, [0, 0.45], [0, 48], { extrapolateRight: "clamp" });
  const strike = interpolate(t, [0.5, 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <>
      <text x="30" y="80" fontSize="15" fontWeight="700" fill={INK} fontFamily="monospace">WATER, TWICE</text>

      {/* In the mix: stop at the mark. The water above it is the mistake. */}
      <text x="105" y="104" fontSize="13" fill={INK} textAnchor="middle" fontFamily="monospace">मिक्समा</text>
      <rect x="40" y="114" width="130" height="122" rx="6" fill="#E6E0D0" stroke={INK} strokeWidth="2" />
      <rect x="48" y={232 - fill} width="114" height={fill} fill="#7FB6D8" />
      <path d="M44 184 H166" stroke={INK} strokeWidth="2" strokeDasharray="6 5" />
      <text x="174" y="189" fontSize="11" fill={MUTED} fontFamily="monospace">max</text>
      <g opacity={strike}>
        <rect x="48" y="140" width="114" height="42" fill="#7FB6D8" opacity="0.4" />
        <path d="M54 142 L158 180" stroke={RED} strokeWidth="4" strokeLinecap="round" />
        <path d="M158 142 L54 180" stroke={RED} strokeWidth="4" strokeLinecap="round" />
      </g>
      <text x="105" y="258" fontSize="12" fill={RED} textAnchor="middle" fontFamily="monospace">
        धेरै पानी = कमजोर
      </text>

      {/* On the slab: keep it wet, and keep it wet for a fortnight. */}
      <text x="288" y="104" fontSize="13" fill={INK} textAnchor="middle" fontFamily="monospace">curing मा</text>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle
          key={i}
          cx={222 + i * 28}
          cy={interpolate((t * 2.2 + i * 0.17) % 1, [0, 1], [128, 182])}
          r="5"
          fill="#7FB6D8"
        />
      ))}
      <rect x="206" y="186" width="164" height="26" fill="#B9BEC4" stroke={INK} strokeWidth="2" />
      <text x="288" y="232" fontSize="12" fill={INK} textAnchor="middle" fontFamily="monospace">ढलान</text>
      <g opacity={interpolate(t, [0.35, 0.65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
        <rect x="236" y="240" width="104" height="30" rx="5" fill={c} />
        <text x="288" y="261" fontSize="16" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="monospace">
          14 दिन
        </text>
      </g>
    </>
  );
};

const ART: Record<ArtName, React.FC<ArtProps>> = {
  soil: Soil,
  setback: Setback,
  certificate: Certificate,
  boq: Boq,
  water: Water,
};

export const TipArt: React.FC<{ name: ArtName; colour: string; width: number }> = ({
  name,
  colour,
  width,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Body = ART[name];

  const inS = spring({ frame, fps, config: { damping: 15, stiffness: 150, mass: 0.7 }, durationInFrames: 26 });
  // The sheet's own clock, so each drawing draws itself while it is up.
  const t = interpolate(frame, [4, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width,
        opacity: interpolate(inS, [0, 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        transform: `translateY(${(1 - inS) * 28}px) scale(${interpolate(inS, [0, 1], [0.97, 1])})`,
      }}
    >
      <svg viewBox="0 0 400 300" width={width} height={width * 0.75} style={{ display: "block" }}>
        <rect x="0" y="0" width="400" height="300" rx="14" fill={SHEET} />
        <rect x="0" y="0" width="400" height="300" rx="14" fill="none" stroke={colour} strokeWidth="5" />
        <rect x="16" y="16" width="368" height="268" rx="6" fill="none" stroke={INK} strokeWidth="1" opacity="0.28" />
        <Body c={colour} t={t} />
      </svg>
    </div>
  );
};
