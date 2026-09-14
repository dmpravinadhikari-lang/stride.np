/**
 * The brief a customer gives us, and the plan we compute from it.
 */
import type { LandUnit } from './units.ts';

export type Direction = 'north' | 'south' | 'east' | 'west';

export interface Setbacks {
  frontFt: number;
  rearFt: number;
  leftFt: number;
  rightFt: number;
}

export interface LandInput {
  /** Area as the customer knows it. Either this or the dimensions are required. */
  area?: { value: number; unit: LandUnit };
  /** Frontage along the road, in feet. */
  widthFt?: number;
  /** Depth away from the road, in feet. */
  depthFt?: number;
  /** Which edge the road runs along. Drives orientation and the parking side. */
  roadSide: Direction;
  roadWidthFt?: number;
  /** Omitted means the defaults in norms.ts are used. */
  setbacks?: Partial<Setbacks>;
}

export interface RequirementInput {
  floors: number;
  bedrooms: number;
  /** Bedrooms that get their own bathroom. Capped at the bedroom count. */
  attachedBathrooms: number;
  parkingCars: number;
  kitchen: boolean;
  living: boolean;
  dining: boolean;
  puja: boolean;
  store: boolean;
  stylePackId: string;
}

export type RoomKind =
  | 'living'
  | 'dining'
  | 'kitchen'
  | 'bedroom'
  | 'master'
  | 'bathroom'
  | 'puja'
  | 'store'
  | 'parking'
  | 'stair'
  | 'family'
  | 'terrace';

export interface PlannedRoom {
  id: string;
  kind: RoomKind;
  nameEn: string;
  nameNe: string;
  /** Feet, measured from the top-left of the buildable footprint. */
  x: number;
  y: number;
  w: number;
  h: number;
  areaSqFt: number;
  /** True when the room came out below the comfortable minimum for its kind. */
  tight: boolean;
}

export interface PlannedFloor {
  level: number;
  nameEn: string;
  nameNe: string;
  rooms: PlannedRoom[];
  areaSqFt: number;
}

export interface HousePlan {
  plot: {
    widthFt: number;
    depthFt: number;
    areaSqFt: number;
    areaLabel: string;
    roadSide: Direction;
  };
  setbacks: Setbacks;
  /** The rectangle the house may occupy, after setbacks. */
  buildable: { widthFt: number; depthFt: number; areaSqFt: number };
  floors: PlannedFloor[];
  totals: {
    builtUpSqFt: number;
    groundCoveragePct: number;
    bedrooms: number;
    bathrooms: number;
  };
  /**
   * Plain-language problems with the brief — a programme too big for the plot,
   * rooms squeezed below a usable size. Shown to the customer rather than
   * silently producing a plan nobody could live in.
   */
  warnings: string[];
  /** False when the requirements simply do not fit the land. */
  fits: boolean;
}
