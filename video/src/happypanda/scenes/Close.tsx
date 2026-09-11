import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ART, HP, SAFE, SITE, rgba } from "../brand";
import { sans } from "../../fonts";
import { Panda } from "../components/Panda";

/**
 * The end card.
 *
 * The logo is blue on white, so it sits on a white card rather than being
 * dropped straight onto the blue ground where it would all but disappear.
 */
export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const card = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 150, mass: 0.7 },
    durationInFrames: 30,
  });
  const address = spring({
    frame: frame - 12,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });
  const cta = spring({
    frame: frame - 20,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });

  return (
    <AbsoluteFill
      style={{
        paddingTop: SAFE.top,
        paddingBottom: SAFE.bottom,
        paddingLeft: SAFE.side,
        paddingRight: SAFE.side,
        alignItems: "center",
        // Centred as one group. Pushing the panda to the floor of the safe
        // area instead left a hole between the call to action and the bottom.
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 830,
          padding: "58px 56px",
          borderRadius: 44,
          background: HP.white,
          boxShadow: "0 46px 90px -34px rgba(6, 26, 40, 0.8)",
          opacity: interpolate(card, [0, 0.3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${(1 - card) * 44}px) scale(${interpolate(card, [0, 1], [0.92, 1])})`,
        }}
      >
        <Img
          src={staticFile(ART.logo)}
          style={{ width: "100%", display: "block" }}
        />
      </div>

      <div
        style={{
          marginTop: 46,
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 54,
          letterSpacing: "-0.02em",
          color: HP.white,
          opacity: address,
          transform: `translateY(${(1 - address) * 18}px)`,
        }}
      >
        {SITE}
      </div>

      <div
        style={{
          marginTop: 22,
          padding: "14px 34px",
          borderRadius: 999,
          border: `2px solid ${rgba.white(0.5)}`,
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: "0.2em",
          color: rgba.white(0.92),
          opacity: cta,
          transform: `translateY(${(1 - cta) * 14}px)`,
        }}
      >
        LINK IN BIO
      </div>

      <div style={{ marginTop: 44 }}>
        <Panda src={ART.namaste} width={470} at={16} rise={100} />
      </div>
    </AbsoluteFill>
  );
};
