/**
 * Style packs — SPEC §6.
 *
 * The visitor never sees a text box. They pick a card; the long tuned prompt
 * lives here on the server. That keeps output quality consistent, makes every
 * request cacheable, and means nobody can push arbitrary text into the model.
 *
 * The single biggest quality risk in this whole system is that base models are
 * trained overwhelmingly on Western and Scandinavian houses. Prompted naively
 * they return a suburban American home with a pitched shingle roof and a lawn,
 * and the client rightly rejects it. So every prompt is built from a shared
 * Kathmandu-valley grounding clause plus a hard negative list, and the pack
 * only supplies the character on top of that. Do not remove the grounding to
 * shorten a prompt.
 */

export interface StylePack {
  id: string;
  nameEn: string;
  nameNe: string;
  descriptionEn: string;
  descriptionNe: string;
  /** Swatch shown on the selection card before a reference photo exists. */
  swatch: string;
  /** Character clause for exteriors. */
  exterior: string;
  /** Character clause for interiors — Phase 2, defined now so packs stay in one place. */
  interior: string;
}

/**
 * Applied to every exterior prompt regardless of pack. These are the details
 * that make the difference between "a house" and "a house in the Kathmandu
 * valley".
 */
const EXTERIOR_GROUNDING = [
  'a residential house in the Kathmandu valley, Nepal',
  'flat concrete roof with a parapet wall and a stainless steel water tank',
  'wooden window frames with slim metal security grills',
  'cement plaster and exposed brick surfaces',
  'strong directional Himalayan valley daylight, crisp shadows',
  'neighbouring houses close by, real Nepali street context',
  'architectural photography, 24mm lens, eye level, sharp focus',
].join(', ');

const INTERIOR_GROUNDING = [
  'interior of a home in the Kathmandu valley, Nepal',
  'terrazzo or polished concrete or marble flooring, never carpet',
  'wooden window frames with metal grills',
  'a ceiling fan',
  'strong directional daylight from one side',
  'interior photography, 24mm lens, eye level, sharp focus',
].join(', ');

/**
 * SPEC §6: negative prompts matter as much as positive ones. "western suburban
 * house", "pitched roof" and "snow" are the three that actually fire — the base
 * models reach for all of them unprompted.
 */
export const NEGATIVE_PROMPT = [
  'watermark',
  'text',
  'signature',
  'people',
  'distorted perspective',
  'warped windows',
  'western suburban house',
  'american suburb',
  'pitched shingle roof',
  'gable roof',
  'snow',
  'lawn',
  'picket fence',
  'scandinavian interior',
  'wall-to-wall carpet',
  'blurry',
  'lowres',
  'deformed',
].join(', ');

export const STYLE_PACKS: StylePack[] = [
  {
    id: 'modern-minimal',
    nameEn: 'Modern Minimal',
    nameNe: 'आधुनिक सरल',
    descriptionEn: 'Clean lines, pale plaster, deep window reveals.',
    descriptionNe: 'सफा रेखा, हल्का प्लास्टर, गहिरा झ्याल।',
    swatch: '#E8E4DC',
    exterior:
      'minimalist modern elevation, smooth off-white plaster, deep recessed window reveals, slim horizontal shading fins, frameless glass balcony rail, restrained palette of white and graphite',
    interior:
      'minimalist interior, pale plaster walls, light grey terrazzo floor, built-in flush joinery, no ornament, one large window',
  },
  {
    id: 'traditional-newari',
    nameEn: 'Traditional Newari',
    nameNe: 'परम्परागत नेवारी',
    descriptionEn: 'Carved timber, aankhi jhyal lattice, dark brick.',
    descriptionNe: 'काठको बुट्टा, आँखी झ्याल, गाढा इँटा।',
    swatch: '#8A4B32',
    exterior:
      'traditional Newari architecture, dark red dachi appa brick facade, intricately carved dark timber window frames, aankhi jhyal lattice screens, deep projecting carved timber eaves, tiered brick cornice, brass detailing',
    interior:
      'traditional Newari interior, exposed dark timber beams and joists, carved wooden aankhi jhyal lattice window, red brick wall, low wooden seating, brass oil lamps',
  },
  {
    id: 'contemporary-concrete',
    nameEn: 'Contemporary Concrete',
    nameNe: 'समकालीन कंक्रिट',
    descriptionEn: 'Board-marked concrete, heavy shade, strong shadow.',
    descriptionNe: 'कंक्रिटको बनावट, गहिरो छाया।',
    swatch: '#8E8F8A',
    exterior:
      'board-marked fair-faced concrete facade, bold cantilevered slabs, deep shaded loggia, vertical concrete louvre screen, raw grey and charcoal palette, brutalist confidence',
    interior:
      'exposed board-marked concrete walls and ceiling, polished concrete floor, dark steel window frames, spare warm timber furniture',
  },
  {
    id: 'warm-wood',
    nameEn: 'Warm Wood',
    nameNe: 'न्यानो काठ',
    descriptionEn: 'Sal timber, warm plaster, soft evening glow.',
    descriptionNe: 'सालको काठ, न्यानो प्लास्टर।',
    swatch: '#B07B45',
    exterior:
      'warm sal timber cladding and slatted screens over cream plaster, timber pergola over the terrace, generous timber-framed windows, honey and sand palette',
    interior:
      'warm sal wood panelling and ceiling battens, cream plaster walls, oiled timber floor inlay over terrazzo, woven jute rug, soft warm light',
  },
  {
    id: 'brick-courtyard',
    nameEn: 'Brick & Courtyard',
    nameNe: 'इँटा र आँगन',
    descriptionEn: 'Exposed brick around an open central chowk.',
    descriptionNe: 'खुला चोक वरिपरि इँटा।',
    swatch: '#9C5B3F',
    exterior:
      'exposed red brick facade with jali perforated brick screens, an open central courtyard chowk visible through a wide opening, stone paved plinth, potted marigold and tulsi, brick and terracotta palette',
    interior:
      'exposed red brick feature wall, perforated brick jali screen casting patterned light, stone flooring, view onto a green internal courtyard',
  },
  {
    id: 'luxury-marble',
    nameEn: 'Luxury Marble',
    nameNe: 'विलासी मार्बल',
    descriptionEn: 'Polished stone, tall glazing, brass edges.',
    descriptionNe: 'चम्किलो ढुङ्गा, अग्ला झ्याल, पित्तल।',
    swatch: '#D9CDBA',
    exterior:
      'cream marble and travertine clad facade, double-height glazed entrance, polished stone plinth, brass trim, tall slim columns, formal symmetrical composition, affluent Kathmandu residence',
    interior:
      'polished cream marble floor with dark inlay border, marble feature wall, brass trim detailing, crystal pendant light, tall curtains, formal luxurious living space',
  },
  {
    id: 'compact-urban',
    nameEn: 'Compact Urban',
    nameNe: 'सहरी सानो घर',
    descriptionEn: 'Narrow plot, stacked floors, every metre used.',
    descriptionNe: 'साँघुरो जग्गा, थुप्रिएका तला।',
    swatch: '#6F7B72',
    exterior:
      'narrow plot tall town house on a small urban footprint, stacked projecting balconies with planters, vertical metal screen for privacy, compact efficient elevation, dense Kathmandu street setting',
    interior:
      'compact clever interior, built-in storage to the ceiling, a mezzanine or under-stair study nook, light colours to open the space, one tall window',
  },
];

export function findPack(id: string): StylePack | undefined {
  return STYLE_PACKS.find((pack) => pack.id === id);
}

export type Lighting = 'day' | 'night';

const LIGHTING: Record<Lighting, string> = {
  day: 'bright midday Himalayan valley sunlight, deep crisp shadows, clear blue sky',
  night:
    'evening dusk, warm interior lights glowing through the windows, deep blue sky, subtle street light',
};

/**
 * Builds the exterior prompt: grounding, then the subject, then pack character,
 * then lighting. Order matters — the grounding leads so the model settles on
 * Nepal before it hears anything that might pull it back toward a Western
 * reference.
 *
 * `subject` describes the massing of a catalogue house type (storeys, plot,
 * frontage) and is absent for a visitor's own photo, where the source image
 * supplies the geometry instead.
 */
export function exteriorPrompt(
  pack: StylePack,
  lighting: Lighting,
  subject?: string,
): string {
  return [
    EXTERIOR_GROUNDING,
    subject,
    pack.exterior,
    LIGHTING[lighting],
  ]
    .filter(Boolean)
    .join(', ');
}

export function interiorPrompt(
  pack: StylePack,
  roomDescription: string,
  lighting: Lighting = 'day',
): string {
  return `${roomDescription}, ${INTERIOR_GROUNDING}, ${pack.interior}, ${LIGHTING[lighting]}`;
}

/** The shape the frontend gets. Prompts are deliberately not included. */
export function publicPacks() {
  return STYLE_PACKS.map(({ id, nameEn, nameNe, descriptionEn, descriptionNe, swatch }) => ({
    id,
    nameEn,
    nameNe,
    descriptionEn,
    descriptionNe,
    swatch,
  }));
}
