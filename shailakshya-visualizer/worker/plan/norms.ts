/**
 * Room sizes and setbacks used to turn a brief into a layout.
 *
 * The room figures are ordinary comfortable sizes for a Nepali family home,
 * in square feet. They are the target the layout aims at; it scales the whole
 * programme to the plot and warns when a room lands under `min`.
 *
 * SETBACKS ARE STARTING VALUES, NOT BYLAW. Required setbacks in the Kathmandu
 * valley depend on the municipality, the land-use zone and the classified width
 * of the adjoining road, and the Terai municipalities differ again. The
 * customer can change them, and the real numbers come from the municipality and
 * the company's engineer. Nothing here should be presented as compliance.
 */
import type { RoomKind, Setbacks } from './types.ts';

export interface RoomNorm {
  nameEn: string;
  nameNe: string;
  /** Comfortable size to aim for. */
  targetSqFt: number;
  /** Below this the room is flagged tight. */
  minSqFt: number;
  /** Longest:shortest side the layout will tolerate before warning. */
  maxAspect: number;
}

export const ROOM_NORMS: Record<RoomKind, RoomNorm> = {
  master:   { nameEn: 'Master bedroom', nameNe: 'मुख्य शयनकक्ष', targetSqFt: 165, minSqFt: 120, maxAspect: 1.8 },
  bedroom:  { nameEn: 'Bedroom',        nameNe: 'शयनकक्ष',       targetSqFt: 120, minSqFt: 90,  maxAspect: 1.8 },
  living:   { nameEn: 'Living room',    nameNe: 'बैठक कोठा',      targetSqFt: 200, minSqFt: 140, maxAspect: 2.0 },
  family:   { nameEn: 'Family area',    nameNe: 'पारिवारिक कोठा', targetSqFt: 130, minSqFt: 90,  maxAspect: 2.0 },
  dining:   { nameEn: 'Dining',         nameNe: 'भोजन कक्ष',      targetSqFt: 120, minSqFt: 90,  maxAspect: 1.8 },
  kitchen:  { nameEn: 'Kitchen',        nameNe: 'भान्सा',         targetSqFt: 105, minSqFt: 70,  maxAspect: 2.2 },
  bathroom: { nameEn: 'Bathroom',       nameNe: 'शौचालय',        targetSqFt: 42,  minSqFt: 30,  maxAspect: 2.2 },
  puja:     { nameEn: 'Puja room',      nameNe: 'पूजा कोठा',      targetSqFt: 50,  minSqFt: 32,  maxAspect: 1.8 },
  store:    { nameEn: 'Store',          nameNe: 'भण्डार',         targetSqFt: 50,  minSqFt: 30,  maxAspect: 2.5 },
  parking:  { nameEn: 'Parking',        nameNe: 'पार्किङ',        targetSqFt: 150, minSqFt: 130, maxAspect: 2.6 },
  stair:    { nameEn: 'Stair',          nameNe: 'भर्‍याङ',         targetSqFt: 85,  minSqFt: 70,  maxAspect: 2.4 },
  terrace:  { nameEn: 'Terrace',        nameNe: 'छत',            targetSqFt: 120, minSqFt: 60,  maxAspect: 3.0 },
};

/**
 * Default setbacks in feet. Deliberately modest, because a plot too small for
 * them is the common case in Kathmandu and over-large defaults would tell most
 * customers their land is unbuildable when it is not.
 */
export const DEFAULT_SETBACKS: Setbacks = {
  frontFt: 8,
  rearFt: 5,
  leftFt: 4,
  rightFt: 4,
};

/**
 * A plot narrower than this cannot take a sensible room either side of a
 * corridor, so the layout keeps to a single bay.
 */
export const NARROW_PLOT_FT = 22;

/** Storey height used for the massing description handed to the image prompt. */
export const STOREY_HEIGHT_FT = 9.5;
