import React from "react";
import { Img, staticFile } from "remotion";
import { HP, rgba } from "../brand";

/** Screen size inside the bezel. The captures are 780 x 1688, the same shape. */
export const SCREEN = { width: 556, height: 1203 } as const;
const BEZEL = 15;

/**
 * The phone the screens are shown in. Drawn rather than photographed, because
 * a real handset photo dates the reel the moment the model changes — and a
 * flat frame keeps the eye on the screen.
 */
export const Phone: React.FC<{ src: string; scale?: number }> = ({
  src,
  scale = 1,
}) => (
  <div
    style={{
      width: SCREEN.width + BEZEL * 2,
      height: SCREEN.height + BEZEL * 2,
      padding: BEZEL,
      borderRadius: 62,
      background: HP.ink,
      boxShadow: `0 40px 80px -30px rgba(6, 26, 40, 0.75), 0 0 0 2px ${rgba.white(0.16)}`,
      transform: `scale(${scale})`,
    }}
  >
    <div
      style={{
        width: SCREEN.width,
        height: SCREEN.height,
        borderRadius: 48,
        overflow: "hidden",
        background: HP.white,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{ width: "100%", display: "block" }}
      />
    </div>
  </div>
);
