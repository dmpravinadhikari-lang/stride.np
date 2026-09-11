import React from "react";
import { BRAND, C } from "../brand";
import { display } from "../fonts";

/**
 * The mark: the wordmark set in type, plus the cyan full stop that is drawn
 * rather than typed. Same construction as the app's `Logo` component — bold,
 * tracking -0.045em, dot at 0.19em sitting on the baseline.
 *
 * `reveal` clips the word from the left and `dotAt` places the dot along that
 * same axis, which is what lets the opening scene walk the dot across the
 * word and leave the letters behind it.
 */
export const Wordmark: React.FC<{
  size: number;
  /** 0 hides the word, 1 shows all of it. Clipped from the right edge. */
  reveal?: number;
  /** Dot position as a fraction of the word's width. 1 is its resting place. */
  dotAt?: number;
  dotScale?: number;
  color?: string;
  dotColor?: string;
}> = ({
  size,
  reveal = 1,
  dotAt = 1,
  dotScale = 1,
  color = C.white,
  dotColor = C.signature,
}) => {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        fontFamily: display,
        fontWeight: 700,
        fontSize: size,
        // The app sets the wordmark at -0.045em. Held here so the mark reads
        // as the same object at 120px that it does at 19px in the header.
        letterSpacing: "-0.045em",
        lineHeight: 1.2,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          display: "inline-block",
          clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)`,
        }}
      >
        {BRAND.wordmark}
      </span>
      <span
        style={{
          position: "absolute",
          // Percentages resolve against the word's own width, because the dot
          // is absolute and so does not widen the box it is measured against.
          left: `${dotAt * 100}%`,
          bottom: size * 0.245,
          marginLeft: size * 0.06,
          width: size * 0.19,
          height: size * 0.19,
          borderRadius: "50%",
          background: dotColor,
          transform: `scale(${dotScale})`,
        }}
      />
    </span>
  );
};
