/**
 * Where a branch is, and what counts as being at it.
 *
 * Carried over from Happy Panda's CRM, which had one office hardcoded. Here
 * the coordinates belong to the branch, because a consultancy with three
 * offices has three places people clock in from.
 */

export type BranchPlace = {
  lat: number | null;
  lng: number | null;
  radius_m: number | null;
  accuracy_allowance_m: number | null;
  name?: string | null;
};

/** Used when a branch has not had its radius set yet. */
export const DEFAULT_RADIUS_M = 120;

const R = 6_371_000;                      // mean earth radius, metres
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. Haversine, exact enough at city scale. */
export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export type Fix = { lat: number; lng: number; accuracy?: number | null };

export type Verdict = {
  within: boolean;
  distance: number;      // metres, or -1 when there was no usable fix
  accuracy: number | null;
  /** Safe to show the person being refused. */
  reason: string | null;
  /** True when the branch has no coordinates, so nothing can be judged. */
  unconfigured: boolean;
};

/**
 * Is this fix at that branch?
 *
 * The accuracy allowance is capped at the radius on purpose. A fix saying
 * "150m away, give or take 90m" is genuinely consistent with standing in the
 * office, and refusing it locks out whoever has a poor view of the sky. But an
 * allowance larger than the radius would quietly undo a tightening of it: set
 * the radius to 100m while forgiving 300m of error and somebody 350m down the
 * road still gets in.
 */
export function verifyAt(branch: BranchPlace, fix: Fix | null | undefined): Verdict {
  if (branch.lat == null || branch.lng == null) {
    // A branch whose location has never been set cannot judge anybody. Saying
    // so is better than silently letting everyone in or refusing everyone.
    return {
      within: false, distance: -1, accuracy: null, unconfigured: true,
      reason: "This branch has no location set yet, so the clock cannot tell where you are. An admin can set it in branch settings.",
    };
  }

  if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) {
    return {
      within: false, distance: -1, accuracy: null, unconfigured: false,
      reason: "No location was shared.",
    };
  }

  const radius = branch.radius_m ?? DEFAULT_RADIUS_M;
  const allowance = Math.min(branch.accuracy_allowance_m ?? radius, radius);

  const distance = distanceM(branch.lat, branch.lng, fix.lat, fix.lng);
  const accuracy = Number.isFinite(fix.accuracy ?? NaN) ? Number(fix.accuracy) : null;
  const slack = Math.min(accuracy ?? 0, allowance);

  if (distance - slack <= radius) {
    return { within: true, distance, accuracy, reason: null, unconfigured: false };
  }

  // The reason has to let somebody tell "my GPS is wrong" from "I am not
  // there", because those need different responses from them.
  const away = distance >= 1000
    ? `${(distance / 1000).toFixed(1)} km`
    : `${distance} m`;
  const vague = accuracy !== null && accuracy > allowance
    ? ` Your phone put the fix at plus or minus ${Math.round(accuracy)} m, which is too vague to place you.`
    : "";

  return {
    within: false, distance, accuracy, unconfigured: false,
    reason: `That is ${away} from ${branch.name ?? "the office"}.${vague}`,
  };
}
