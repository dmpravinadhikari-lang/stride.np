import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE, SH, rgba } from "../brand";
import { nepali } from "../../fonts";
import { Phone } from "../components/Phone";

/**
 * The site, in the order a person actually worries: what will it cost, can I
 * borrow it, and who are you.
 *
 * Every screen is shilakshya.com.np itself, captured live — including the two
 * that are the whole point of the reel, the cost estimate and the EMI, which
 * are shown with their real numbers on them rather than as an empty form.
 */
const SCREENS = [
  { shot: "shilakshya/live/home.png", caption: "घर बनाउने सोच्दै?" },
  { shot: "shilakshya/live/cost-start.png", caption: "खर्च कति लाग्ला?" },
  { shot: "shilakshya/live/cost-total.png", caption: "पूरा estimate, रुपैयाँमा" },
  { shot: "shilakshya/live/emi-input.png", caption: "बैंक लोन लिने?" },
  { shot: "shilakshya/live/emi-result.png", caption: "EMI कति आउँछ, हेर्नुहोस्" },
  { shot: "shilakshya/live/service.png", caption: "हाम्रा सेवाहरू" },
  { shot: "shilakshya/live/gallery.png", caption: "हाम्रा प्रोजेक्टहरू" },
];

/** A second and four fifths each — these screens carry numbers to read. */
export const PER_SCREEN = 54;
export const SCREENS_DURATION = SCREENS.length * PER_SCREEN;

export const Screens: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const index = Math.min(SCREENS.length - 1, Math.floor(frame / PER_SCREEN));
  const local = frame - index * PER_SCREEN;
  const screen = SCREENS[index];

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
          padding: "14px 34px",
          borderRadius: 999,
          background: SH.gold,
          color: SH.navy,
          fontFamily: nepali,
          fontWeight: 700,
          fontSize: 40,
          lineHeight: 1.4,
          boxShadow: `0 14px 34px -14px rgba(4, 12, 22, 0.7)`,
          opacity: interpolate(caption, [0, 0.4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${(1 - caption) * 18}px)`,
        }}
      >
        {screen.caption}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        {SCREENS.map((s, i) => (
          <div
            key={s.shot}
            style={{
              width: i === index ? 34 : 10,
              height: 10,
              borderRadius: 999,
              background: i === index ? SH.gold : rgba.white(0.34),
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
          marginTop: 22,
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
