/**
 * The company's standard house types — SPEC §5.2.
 *
 * This is the list the pre-generation catalogue keys on. Every entry here is
 * multiplied by every style pack and generated once, offline, so visitors who
 * browse get instant results at zero cost.
 *
 * ============================================================================
 * THIS IS EXAMPLE DATA. REPLACE IT WITH SHAILAKSHYA'S ACTUAL HOUSE TYPES
 * BEFORE RUNNING THE PRE-GENERATION SCRIPT.
 * ============================================================================
 *
 * Generating the examples below would spend real Neurons on houses the company
 * does not build, so `npm run pregenerate` refuses to run while EXAMPLE_DATA is
 * true. Set it to false once the list is real.
 *
 * What makes a good entry: the `subject` clause is dropped straight into the
 * prompt, so describe the massing and the plot, not the finish. The finish is
 * what the style pack supplies — that is the whole point of the matrix.
 */

export const EXAMPLE_DATA = true;

export interface HouseType {
  /** Stable id. Part of the cache key, so changing it orphans cached results. */
  id: string;
  nameEn: string;
  nameNe: string;
  /** Shown on the catalogue card. */
  summaryEn: string;
  summaryNe: string;
  /**
   * Dropped into the prompt ahead of the style clause. Massing, storeys, plot
   * and openings — never materials or colour.
   */
  subject: string;
}

export const HOUSE_TYPES: HouseType[] = [
  {
    id: 'example-2storey-4aana',
    nameEn: '2 storey on 4 aana',
    nameNe: '४ आनामा २ तले',
    summaryEn: 'A square plan with a front setback and a small garden.',
    summaryNe: 'अगाडि खाली ठाउँ भएको वर्गाकार घर।',
    subject:
      'a two storey detached family house on a small square plot, symmetrical frontage, three bays wide, a projecting first floor balcony over the entrance, a short front setback with a compound wall and gate',
  },
  {
    id: 'example-3storey-narrow',
    nameEn: '3 storey narrow plot',
    nameNe: 'साँघुरो जग्गामा ३ तले',
    summaryEn: 'Tall and narrow, built to the plot edges.',
    summaryNe: 'अग्लो र साँघुरो, जग्गाभरि बनेको।',
    subject:
      'a three storey town house on a narrow deep plot, tall narrow frontage two bays wide, stacked projecting balconies, built right up to the neighbouring buildings on both sides',
  },
  {
    id: 'example-bungalow-8aana',
    nameEn: 'Bungalow on 8 aana',
    nameNe: '८ आनामा बङ्गलो',
    summaryEn: 'Single storey, wide frontage, garden on three sides.',
    summaryNe: 'एक तले, फराकिलो, वरिपरि बगैंचा।',
    subject:
      'a single storey bungalow with a wide horizontal frontage on a generous plot, deep verandah across the front, low massing, garden on three sides',
  },
];

export function findHouseType(id: string): HouseType | undefined {
  return HOUSE_TYPES.find((house) => house.id === id);
}

/** Catalogue cards for the frontend. The prompt subject is not exposed. */
export function publicHouseTypes() {
  return HOUSE_TYPES.map(({ id, nameEn, nameNe, summaryEn, summaryNe }) => ({
    id,
    nameEn,
    nameNe,
    summaryEn,
    summaryNe,
  }));
}
