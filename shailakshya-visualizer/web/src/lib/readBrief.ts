/**
 * A best-effort read of a typed description, in the browser.
 *
 * This is NOT the parser. The real one is a language model in the Worker and
 * it understands sentences; this understands numbers next to keywords. It
 * exists for one reason: when the model is unavailable — no key configured, a
 * refusal, the daily ceiling reached, the network down — the visitor must not
 * be dropped onto a blank form with their sentence deleted. Before this, a
 * person who wrote "road on the east" was silently shown a form saying south.
 *
 * So the contract is deliberately narrow:
 *
 *  - It only ever fills fields it is confident about, and reports which ones
 *    it filled so the UI can say so honestly.
 *  - Everything it fills is shown in an editable form for the person to check.
 *    Nothing here reaches the layout engine unseen.
 *  - It never guesses. An unreadable sentence yields an empty result and the
 *    form's ordinary defaults, which is exactly what happened before.
 *
 * It reads Devanagari and Latin digits, Nepali and English number words, and
 * the romanised Nepali people actually type on a phone keyboard.
 */
import type { Brief, LandUnit } from './api.ts';

export interface ReadResult {
  /** Only the fields that were actually recognised. */
  land: Partial<Brief['land']>;
  requirements: Partial<Brief['requirements']>;
  /** Field labels that were filled, for showing the person what we took. */
  found: string[];
}

const DEV_DIGITS = '०१२३४५६७८९';

/** Devanagari digits to Latin, so one set of number patterns covers both. */
function latinise(text: string): string {
  return text.replace(/[०-९]/g, (d) => String(DEV_DIGITS.indexOf(d)));
}

/**
 * `\b` is an ASCII word boundary, so it never fires next to Devanagari: a
 * pattern written /\bदुई\b/ silently matches nothing at all. These bound a
 * Devanagari word against its own script instead, which is what stops "छ"
 * (six) from matching inside "बन्छ".
 *
 * The range is spelled as escape text rather than as the two literal
 * characters on purpose. These strings are compiled with `new RegExp`, and a
 * page served without a charset decodes the bundle as Latin-1 — at which point
 * a literal range becomes reversed, `new RegExp` throws "Range out of order",
 * and the whole widget dies before it renders anything. Written this way the
 * pattern is pure ASCII and cannot be corrupted; the Devanagari words below
 * would merely stop matching, which is a bad day rather than a blank page.
 */
const DEV_RANGE = '\\u0900-\\u097F';
const dev = (word: string) => `(?<![${DEV_RANGE}])${word}(?![${DEV_RANGE}])`;

/**
 * Number words. Nepali in both scripts, plus the halves people actually say —
 * "साढे दुई" and "dedh" are how storeys get described out loud, and a parser
 * that only reads digits misses most of the sentences this product receives.
 */
const WORD_NUMBERS: Array<[string, number]> = [
  [`\\bsaa?dhe\\s+tin\\b|${dev('साढे\\s*तीन')}`, 3.5],
  [`\\bsaa?dhe\\s+dui\\b|${dev('साढे\\s*दुई')}`, 2.5],
  [`\\bdedh\\b|${dev('डेढ')}`, 1.5],
  [`\\b(?:ek|one|single)\\b|${dev('एक')}`, 1],
  [`\\b(?:dui|two|double)\\b|${dev('दुई')}`, 2],
  [`\\b(?:ti?n|three)\\b|${dev('तीन')}`, 3],
  [`\\b(?:chaa?r|four)\\b|${dev('चार')}`, 4],
  [`\\b(?:panch|five)\\b|${dev('पाँच')}`, 5],
  [`\\b(?:chha|six)\\b|${dev('छ')}`, 6],
  [`\\b(?:sat|seven)\\b|${dev('सात')}`, 7],
  [`\\b(?:aath|eight)\\b|${dev('आठ')}`, 8],
];

/** The land units this product accepts, with how each is written in the wild. */
const UNITS: Array<[LandUnit, RegExp]> = [
  ['ropani', /ropani|रोपनी/i],
  ['aana', /a+na\b|aana|आना/i],
  ['paisa', /paisa|पैसा/i],
  ['daam', /daam\b|दाम/i],
  ['bigha', /bigha|बिघा/i],
  ['kattha', /kat+ha|कट्ठा/i],
  ['dhur', /dhur|धुर/i],
  ['sqm', /sq\.?\s*m|square\s*met|वर्ग\s*मिटर/i],
  ['sqft', /sq\.?\s*(ft|feet)|square\s*f(ee)?t|वर्ग\s*फिट/i],
];

const SIDES: Array<[Brief['land']['roadSide'], RegExp]> = [
  ['north', /\bnorth\b|उत्तर/i],
  ['south', /\bsouth\b|दक्षिण/i],
  ['east', /\beast\b|पूर्व/i],
  ['west', /\bwest\b|पश्चिम/i],
];

/** A number immediately before or after `unit`, in either order. */
function amountFor(text: string, unit: RegExp): number | undefined {
  const source = unit.source;
  const before = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${source})`, 'i').exec(text);
  if (before?.[1]) return Number(before[1]);

  for (const [pattern, value] of WORD_NUMBERS) {
    if (new RegExp(`(?:${pattern})\\s*(?:${source})`, 'i').test(text)) return value;
  }
  return undefined;
}

/** A count for a thing: "3 bedrooms", "तीन शयनकक्ष", "4 bed". */
function countFor(text: string, noun: RegExp): number | undefined {
  const digits = new RegExp(`(\\d+)\\s*(?:${noun.source})`, 'i').exec(text);
  if (digits?.[1]) return Number(digits[1]);

  for (const [pattern, value] of WORD_NUMBERS) {
    if (new RegExp(`(?:${pattern})\\s*(?:${noun.source})`, 'i').test(text)) {
      return Math.round(value);
    }
  }
  return undefined;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export function readBrief(input: string): ReadResult {
  const text = latinise(input);
  const land: Partial<Brief['land']> = {};
  const requirements: Partial<Brief['requirements']> = {};
  const found: string[] = [];

  // Explicit dimensions win over an area: "40 by 60" describes the plot far
  // better than converting it to aana and guessing the proportions back.
  const dims = /(\d+(?:\.\d+)?)\s*(?:by|x|×|\*)\s*(\d+(?:\.\d+)?)/i.exec(text);
  if (dims?.[1] && dims[2]) {
    const w = Number(dims[1]);
    const d = Number(dims[2]);
    // Sanity: a plot is feet, not metres or inches. Anything outside this is
    // more likely a room size or a phone number than a plot.
    if (w >= 8 && w <= 500 && d >= 8 && d <= 500) {
      land.widthFt = w;
      land.depthFt = d;
      found.push('plot size');
    }
  }

  for (const [unit, pattern] of UNITS) {
    const value = amountFor(text, pattern);
    if (value !== undefined && value > 0 && value < 100000) {
      land.area = { value, unit };
      found.push('land area');
      break;
    }
  }

  for (const [side, pattern] of SIDES) {
    // Only when the sentence is actually about the road or the facing, so
    // "east Kathmandu" does not silently become the road side.
    if (pattern.test(text) && /road|सडक|facing|mukh|मुख|बाटो/i.test(text)) {
      land.roadSide = side;
      found.push('road side');
      break;
    }
  }

  const storeys =
    amountFor(text, /storey|story|floors?|tale\b|तले|तला/i) ??
    (/\bbungalow\b|\bbanglow\b/i.test(text) ? 1 : undefined);
  if (storeys !== undefined) {
    // Half storeys are real here — "2.5 tale" is a full two floors plus a
    // partial top — and the layout engine counts whole ones, so round up.
    requirements.floors = clamp(Math.ceil(storeys), 1, 8);
    found.push('storeys');
  }

  const bedrooms = countFor(text, /bed\s*rooms?|bedrooms?|शयनकक्ष|kotha\b|बेडरुम/i);
  if (bedrooms !== undefined) {
    requirements.bedrooms = clamp(bedrooms, 1, 12);
    found.push('bedrooms');
  }

  const baths = countFor(text, /(?:attached\s+)?bath\s*rooms?|बाथरुम|शौचालय/i);
  if (baths !== undefined) {
    requirements.attachedBathrooms = clamp(baths, 0, 12);
    found.push('bathrooms');
  }

  // "no parking" and "parking chaahidaina" have to beat the word "parking".
  if (/\b(no|without)\s+parking\b|parking\s+(?:chaa?hi?dai?na|छैन)|पार्किङ\s*चाहिँदैन/i.test(text)) {
    requirements.parkingCars = 0;
    found.push('parking');
  } else if (/parking|पार्किङ|garage|car\b|गाडी/i.test(text)) {
    requirements.parkingCars = clamp(countFor(text, /cars?|गाडी|parking/i) ?? 1, 1, 6);
    found.push('parking');
  }

  if (/puja|pooja|पूजा|prayer\s+room|मन्दिर/i.test(text)) {
    requirements.puja = true;
    found.push('puja room');
  }
  if (/\bstore\b|storage|भण्डार|स्टोर/i.test(text)) {
    requirements.store = true;
    found.push('store');
  }

  return { land, requirements, found };
}

/**
 * The read merged onto the form's ordinary defaults, ready to prefill.
 *
 * Anything not recognised keeps the default it always had, so a sentence this
 * cannot read leaves the visitor exactly where they were before — never worse.
 */
export function briefFrom(read: ReadResult, stylePackId?: string): Brief {
  return {
    land: {
      area: read.land.area ?? (read.land.widthFt ? undefined : { value: 4, unit: 'aana' }),
      widthFt: read.land.widthFt,
      depthFt: read.land.depthFt,
      roadSide: read.land.roadSide ?? 'south',
    },
    requirements: {
      floors: read.requirements.floors ?? 2,
      bedrooms: read.requirements.bedrooms ?? 3,
      attachedBathrooms: read.requirements.attachedBathrooms ?? 1,
      parkingCars: read.requirements.parkingCars ?? 1,
      kitchen: true,
      living: true,
      dining: true,
      puja: read.requirements.puja ?? true,
      store: read.requirements.store ?? false,
      stylePackId: stylePackId ?? '',
    },
  };
}
