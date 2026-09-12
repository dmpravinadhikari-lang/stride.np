import React from "react";
import { Img, staticFile } from "remotion";
import { SH, rgba } from "../brand";

/** Screen size inside the bezel. The captures are 780 x 1688, the same shape. */
export const SCREEN = { width: 556, height: 1203 } as const;
const BEZEL = 15;

export const Phone: React.FC<{ src: string; scale?: number }> = ({ src, scale = 1 }) => (
  <div
    style={{
      width: SCREEN.width + BEZEL * 2,
      height: SCREEN.height + BEZEL * 2,
      padding: BEZEL,
      borderRadius: 62,
      background: SH.navy,
      boxShadow: `0 40px 80px -30px rgba(4, 12, 22, 0.8), 0 0 0 2px ${rgba.gold(0.28)}`,
      transform: `scale(${scale})`,
    }}
  >
    <div
      style={{
        width: SCREEN.width,
        height: SCREEN.height,
        borderRadius: 48,
        overflow: "hidden",
        background: SH.white,
      }}
    >
      <Img src={staticFile(src)} style={{ width: "100%", display: "block" }} />
    </div>
  </div>
);
