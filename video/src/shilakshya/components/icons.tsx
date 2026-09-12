import React from "react";

/**
 * What a building site is made of, drawn as silhouettes in a 100 x 100 box.
 *
 * They sit behind everything at around a tenth opacity, so each one is built
 * from a few large shapes — a dozer that is right about the tracks and the
 * blade reads as a dozer at 14% white on navy, and one that is right about the
 * hydraulics does not read at all.
 */
export type IconName =
  | "hardHat"
  | "bricks"
  | "shovel"
  | "mixer"
  | "dozer"
  | "crane"
  | "trowel"
  | "level"
  | "truss";

const PATHS: Record<IconName, React.ReactNode> = {
  hardHat: (
    <g>
      <path d="M50 20c-17 0-29 13-29 32h58c0-19-12-32-29-32Z" />
      <path d="M45 22h10v30H45z" />
      <path d="M8 54h84a7 7 0 0 1 0 14H8a7 7 0 0 1 0-14Z" />
    </g>
  ),

  /** Courses staggered the way they are actually laid. */
  bricks: (
    <path d="M6 22h34v16H6V22Zm42 0h34v16H48V22ZM24 42h34v16H24V42Zm42 0h30v16H66V42ZM6 62h34v16H6V62Zm42 0h34v16H48V62Z" />
  ),

  shovel: (
    <g>
      <path d="M34 6h32v10H34z" />
      <path d="M45 16h10v48H45z" />
      <path d="M32 64h36v12c0 11-8 19-18 19s-18-8-18-19V64Z" />
    </g>
  ),

  /** Drum on its stand, with the mouth open and the wheels under it. */
  mixer: (
    <g>
      <path d="M26 18 66 10l10 34-40 8-10-34Z" />
      <path d="M64 8a11 11 0 1 0 5 21 11 11 0 0 0-5-21Zm2 7a4 4 0 1 1-2 8 4 4 0 0 1 2-8Z" />
      <path d="M34 50 22 84h9l10-28-7-6Zm18 0 12 34h-9L45 56l7-6Z" />
      <path d="M22 82a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm42 0a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
    </g>
  ),

  dozer: (
    <g>
      <path d="M6 42h15v40H6z" />
      <path d="M21 58h14v10H21z" />
      <path d="M35 38h44v30H35z" />
      <path d="M47 18h24v20H47z" />
      <path d="M26 70h58a9 9 0 0 1 0 18H26a9 9 0 0 1 0-18Z" />
    </g>
  ),

  /** Tower crane: mast, jib, counter-jib and the block on its line. */
  crane: (
    <g>
      <path d="M44 24h12v64H44z" />
      <path d="M28 88h44v8H28z" />
      <path d="M56 20h42v8H56z" />
      <path d="M12 20h32v8H12z" />
      <path d="M12 28h14v12H12z" />
      <path d="M84 28h3v24h-3z" />
      <path d="M78 52h15v9H78z" />
    </g>
  ),

  trowel: (
    <g>
      <path d="M8 14 58 44 30 68Z" />
      <path d="M54 36 66 27l7 9-12 9z" />
      <path d="M68 22 88 7l7 9-20 15z" />
    </g>
  ),

  /** A spirit level, with the vial cut out of it rather than drawn on it. */
  level: (
    <path
      fillRule="evenodd"
      d="M8 38h84a8 8 0 0 1 8 8v10a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8V46a8 8 0 0 1 8-8Zm30 6h24v14H38V44Z"
    />
  ),

  /** The roof frame, which is the moment a house starts looking like one. */
  truss: (
    <g>
      <path d="M50 10 96 46l-7 9L50 25 11 55l-7-9L50 10Z" />
      <path d="M18 58h64v8H18z" />
      <path d="M20 66h8v28h-8zM72 66h8v28h-8z" />
    </g>
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
