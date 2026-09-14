/**
 * Nepali land measurement.
 *
 * Customers describe their plot in aana or ropani in the hills and the valley,
 * and in kattha, dhur or bigha in the Terai. Asking them to convert to square
 * feet first would lose people at the first field, so the form accepts all of
 * them and converts here.
 *
 * The ratios are exact by definition, not approximations:
 *   1 ropani = 16 aana = 64 paisa = 256 daam
 *   1 bigha  = 20 kattha = 400 dhur
 */

export type LandUnit =
  | 'sqft'
  | 'sqm'
  | 'aana'
  | 'paisa'
  | 'daam'
  | 'ropani'
  | 'kattha'
  | 'dhur'
  | 'bigha';

const SQ_FT: Record<LandUnit, number> = {
  sqft: 1,
  sqm: 10.7639104167,
  // Hill and valley system.
  ropani: 5476,
  aana: 342.25,
  paisa: 85.5625,
  daam: 21.390625,
  // Terai system.
  bigha: 72900,
  kattha: 3645,
  dhur: 182.25,
};

export const UNIT_LABELS: Record<LandUnit, { en: string; ne: string }> = {
  sqft: { en: 'sq ft', ne: 'वर्ग फिट' },
  sqm: { en: 'sq m', ne: 'वर्ग मिटर' },
  ropani: { en: 'ropani', ne: 'रोपनी' },
  aana: { en: 'aana', ne: 'आना' },
  paisa: { en: 'paisa', ne: 'पैसा' },
  daam: { en: 'daam', ne: 'दाम' },
  bigha: { en: 'bigha', ne: 'बिघा' },
  kattha: { en: 'kattha', ne: 'कट्ठा' },
  dhur: { en: 'dhur', ne: 'धुर' },
};

export function toSqFt(value: number, unit: LandUnit): number {
  return value * SQ_FT[unit];
}

export function fromSqFt(sqft: number, unit: LandUnit): number {
  return sqft / SQ_FT[unit];
}

/** "3 aana 2 paisa" — how a plot is actually spoken about. */
export function describeAreaNepali(sqft: number): string {
  if (sqft >= SQ_FT.kattha * 2) {
    const kattha = sqft / SQ_FT.kattha;
    return `${kattha.toFixed(2)} kattha`;
  }

  const totalDaam = sqft / SQ_FT.daam;
  const ropani = Math.floor(totalDaam / 256);
  const aana = Math.floor((totalDaam % 256) / 16);
  const paisa = Math.floor((totalDaam % 16) / 4);

  const parts: string[] = [];
  if (ropani) parts.push(`${ropani} ropani`);
  if (aana) parts.push(`${aana} aana`);
  if (paisa) parts.push(`${paisa} paisa`);

  return parts.length > 0 ? parts.join(' ') : `${sqft.toFixed(0)} sq ft`;
}
