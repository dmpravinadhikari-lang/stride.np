import React from "react";

/**
 * The furniture of going abroad, drawn rather than fetched: the papers, the
 * flights, and the landmark each destination is recognised by.
 *
 * Every one is a silhouette in a 100 x 100 box, so the backdrop can place them
 * at any size with one component and they all read at the same weight. They
 * sit at low opacity behind everything, so they are built from big simple
 * shapes — detail would only turn to mud.
 */
export type IconName =
  | "plane"
  | "passport"
  | "boardingPass"
  | "suitcase"
  | "cap"
  | "globe"
  | "bigBen"
  | "operaHouse"
  | "maple";

const PATHS: Record<IconName, React.ReactNode> = {
  /** Seen from above, the way a flight path is drawn. */
  plane: (
    <path d="M50 4c4.2 0 7 8 7 21l35 23v10L57 47v24l13 10v9l-20-6-20 6v-9l13-10V47L8 58V48l35-23c0-13 2.8-21 7-21Z" />
  ),

  passport: (
    <g>
      <path d="M24 8h44a8 8 0 0 1 8 8v68a8 8 0 0 1-8 8H24a8 8 0 0 1-8-8V16a8 8 0 0 1 8-8Zm0 8v68h44V16H24Z" />
      <path d="M46 26a15 15 0 1 0 0 30 15 15 0 0 0 0-30Zm0 6a9 9 0 0 1 0 18 9 9 0 0 1 0-18Z" />
      <path d="M31 66h30v5H31zM36 76h20v5H36z" />
    </g>
  ),

  /** The stub torn along the perforation, which is the shape people know. */
  boardingPass: (
    <g>
      <path d="M8 26h84v14a10 10 0 0 0 0 20v14H8V60a10 10 0 0 0 0-20V26Zm6 6v4.6a16 16 0 0 1 0 26.8V68h72v-4.6a16 16 0 0 1 0-26.8V32H14Z" />
      <path d="M22 44h26v5H22zM22 54h18v5H22zM64 42h4v16h-4z" />
    </g>
  ),

  suitcase: (
    <g>
      <path d="M36 16h28a8 8 0 0 1 8 8v6h8a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8h8v-6a8 8 0 0 1 8-8Zm0 8v6h28v-6H36ZM20 38v40h60V38H20Z" />
      <path d="M44 46h5v24h-5zM56 46h5v24h-5z" />
    </g>
  ),

  /** A mortarboard: the lid, the cap under it, and the tassel. */
  cap: (
    <g>
      <path d="M50 16 4 38l46 22 46-22-46-22Zm0 9 27 13-27 13-27-13 27-13Z" />
      <path d="M24 48v18c0 7 12 12 26 12s26-5 26-12V48l-6 3v14c0 3-9 7-20 7s-20-4-20-7V51l-6-3Z" />
      <path d="M88 40v22h-5V40zM83 62h5l-2.5 12L83 62Z" />
    </g>
  ),

  globe: (
    <g>
      <path d="M50 6a44 44 0 1 0 0 88 44 44 0 0 0 0-88Zm0 6a38 38 0 0 1 0 76 38 38 0 0 1 0-76Z" />
      <path d="M50 6c-11 0-20 19.7-20 44s9 44 20 44 20-19.7 20-44S61 6 50 6Zm0 6c5.6 0 14 15.6 14 38s-8.4 38-14 38-14-15.6-14-38 8.4-38 14-38Z" />
      <path d="M10 34h80v6H10zM10 60h80v6H10z" />
    </g>
  ),

  /**
   * London: spire, belfry, the clock face, the shaft.
   *
   * The face is cut out of the housing rather than drawn on top of it —
   * evenodd makes the hole, and a hole is what reads as a clock at this size.
   */
  bigBen: (
    <path
      fillRule="evenodd"
      d="M50 2 62 20H38L50 2ZM40 22h20v8H40v-8Zm-6 10h32v26H34V32Zm16 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-12 21h24v34H38V58Zm-6 34h36v6H32v-6Z"
    />
  ),

  /** Sydney: three sails over the water, largest at the front. */
  operaHouse: (
    <g>
      <path d="M12 76C12 52 26 34 42 34c-6 12-8 26-8 42H12Z" />
      <path d="M32 76c0-28 16-48 34-48-7 14-10 30-10 48H32Z" />
      <path d="M54 76c0-22 13-38 28-38-6 11-9 24-9 38H54Z" />
      <path d="M6 80h88v8H6z" />
    </g>
  ),

  /**
   * Canada. Bigger lobes and fewer of them than a botanically honest leaf:
   * at this size and opacity a finely pointed one just reads as a star.
   */
  maple: (
    <path d="M50 6 57 23 69 17 66 30 83 28 77 39 92 46 78 54 84 64 68 61 70 72 57 67 59 92H41l2-25-13 5 2-11-16 3 6-10L8 46l15-7-6-11 17 2-3-13 12 6L50 6Z" />
  ),
};

export const Icon: React.FC<{ name: IconName; size: number; color: string }> = ({
  name,
  size,
  color,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill={color} style={{ display: "block" }}>
    {PATHS[name]}
  </svg>
);
