/**
 * Generates the reference illustration set.
 *
 *   node scripts/make-reference-art.mjs
 *
 * These are hand-drawn vector illustrations, not photographs and not model
 * output. They exist so the product is demoable before the company's own
 * photography arrives, and so nothing in the repository is anyone else's
 * copyrighted work.
 *
 * They are deliberately stylised rather than faux-photographic. A flat
 * illustration reads as an intentional placeholder; a bad fake photo reads as a
 * broken product, and would also misrepresent what the generator actually
 * produces.
 *
 * The hero pair is the reason this is a generator and not two drawings: the
 * before/after slider only works if both frames share identical geometry, so
 * both are drawn from one `house()` call with different material treatments.
 * Photographs almost never register that precisely.
 *
 * Everything here is Kathmandu-valley specific on purpose — flat roofs with
 * parapets and water tanks, window grills, close neighbours, overhead wires.
 * The same details the prompts insist on (worker/styles/packs.ts).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'web', 'public', 'reference');

const W = 1200;
const H = 900;

// ---------------------------------------------------------------------------
// Material treatments. One entry per style pack in worker/styles/packs.ts.
// ---------------------------------------------------------------------------

const TREATMENTS = {
  bare: {
    wall: '#C3C0B8',
    wallDark: '#ADA9A0',
    trim: '#B0ADA4',
    frame: '#6E7679',
    glass: '#7C8589',
    accent: '#8D8578',
    texture: 'none',
    detail: 'none',
  },
  'modern-minimal': {
    wall: '#EDEAE3',
    wallDark: '#DAD5CB',
    trim: '#2E3338',
    frame: '#2E3338',
    glass: '#8FA3AC',
    accent: '#2E3338',
    texture: 'none',
    detail: 'fins',
  },
  'traditional-newari': {
    wall: '#8A4B32',
    wallDark: '#6F3A26',
    trim: '#43291B',
    frame: '#43291B',
    glass: '#2A211A',
    accent: '#B98A3E',
    texture: 'brick',
    detail: 'jhyal',
  },
  'contemporary-concrete': {
    wall: '#9A9B96',
    wallDark: '#84857F',
    trim: '#5E625F',
    frame: '#3B3F3E',
    glass: '#78868B',
    accent: '#6E7370',
    texture: 'board',
    detail: 'louvre',
  },
  'warm-wood': {
    wall: '#E4D9C6',
    wallDark: '#CFC1A9',
    trim: '#B07B45',
    frame: '#8A5C31',
    glass: '#8AA0A6',
    accent: '#B07B45',
    texture: 'none',
    detail: 'slats',
  },
  'brick-courtyard': {
    wall: '#9C5B3F',
    wallDark: '#834A32',
    trim: '#6B3B27',
    frame: '#5A3A22',
    glass: '#5F6B6E',
    accent: '#E0A11B',
    texture: 'brick',
    detail: 'jali',
  },
  'luxury-marble': {
    wall: '#EDE6D8',
    wallDark: '#DCD2BE',
    trim: '#B49256',
    frame: '#8F7A46',
    glass: '#93A7B0',
    accent: '#B49256',
    texture: 'panel',
    detail: 'columns',
  },
  'compact-urban': {
    wall: '#DDDBD4',
    wallDark: '#C6C4BC',
    trim: '#5A6560',
    frame: '#3F4A45',
    glass: '#8497A0',
    accent: '#6F7B72',
    texture: 'none',
    detail: 'screen',
  },
};

const SKY = {
  day: { top: '#BBD4E6', bottom: '#E4EDF2', ground: '#B8B2A6', light: 0 },
  night: { top: '#1B2430', bottom: '#3A4451', ground: '#4A4740', light: 1 },
};

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);

function defs() {
  return `<defs>
    <pattern id="brick" width="34" height="16" patternUnits="userSpaceOnUse">
      <rect width="34" height="16" fill="none"/>
      <path d="M0 15.5H34M17 0V15.5M0 7.5H34M8.5 0V7.5" stroke="#000" stroke-opacity="0.16" stroke-width="1.4"/>
    </pattern>
    <pattern id="board" width="18" height="60" patternUnits="userSpaceOnUse">
      <rect width="18" height="60" fill="none"/>
      <path d="M17.4 0V60" stroke="#000" stroke-opacity="0.1" stroke-width="1.6"/>
    </pattern>
    <pattern id="panel" width="80" height="80" patternUnits="userSpaceOnUse">
      <rect width="80" height="80" fill="none"/>
      <path d="M0 79.5H80M79.5 0V80" stroke="#000" stroke-opacity="0.07" stroke-width="1.4"/>
    </pattern>
    <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--sky-top)"/>
      <stop offset="100%" stop-color="var(--sky-bottom)"/>
    </linearGradient>
    <radialGradient id="lampGlow">
      <stop offset="0%" stop-color="#FFD68A" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#FFD68A" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
}

function sky(mode) {
  const s = SKY[mode];
  return `<rect width="${W}" height="${H}" fill="${s.top}"/>
  <rect width="${W}" height="${H * 0.72}" fill="${s.bottom}" opacity="0.65"/>`;
}

/** Neighbouring buildings — Kathmandu plots are tight and it should show. */
function neighbours(mode) {
  const dim = mode === 'night' ? '#232A33' : '#B9B4AA';
  const dim2 = mode === 'night' ? '#1D242C' : '#A9A499';
  const win = mode === 'night' ? '#F2C879' : '#7E8A8F';

  const lit = (x, y, w, h, on) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${on ? win : dim2}" opacity="${on ? 0.95 : 0.8}"/>`;

  return `<g>
    <rect x="-10" y="330" width="190" height="360" fill="${dim}"/>
    ${lit(20, 370, 40, 46, mode === 'night')}
    ${lit(90, 370, 40, 46, false)}
    ${lit(20, 460, 40, 46, false)}
    ${lit(90, 460, 40, 46, mode === 'night')}
    <rect x="1030" y="300" width="190" height="390" fill="${dim}"/>
    ${lit(1060, 340, 42, 48, mode === 'night')}
    ${lit(1135, 340, 42, 48, mode === 'night')}
    ${lit(1060, 430, 42, 48, false)}
    <rect x="1120" y="252" width="54" height="30" rx="4" fill="${mode === 'night' ? '#33404B' : '#9AA0A2'}"/>
  </g>`;
}

/** Overhead wires. Nothing says "Kathmandu street" faster. */
function wires(mode) {
  const c = mode === 'night' ? '#141A21' : '#6C6A64';
  return `<g stroke="${c}" stroke-opacity="0.55" fill="none" stroke-width="2.2">
    <path d="M0 262 Q 600 300 1200 254"/>
    <path d="M0 276 Q 600 318 1200 268"/>
    <path d="M0 290 Q 600 332 1200 284"/>
  </g>
  <rect x="960" y="236" width="7" height="300" fill="${c}" opacity="0.75"/>`;
}

/** Flat roof furniture: parapet, railing, and the stainless water tank. */
function roofline(t, mode, x, y, w) {
  const tankBody = mode === 'night' ? '#7E878C' : '#B9BEC0';
  const railing = mode === 'night' ? '#2A3138' : '#6E7679';

  let rails = '';
  for (let i = x + 16; i < x + w - 16; i += 26) {
    rails += `<rect x="${i}" y="${y - 46}" width="3" height="46" fill="${railing}" opacity="0.85"/>`;
  }

  return `<g>
    ${rails}
    <rect x="${x}" y="${y - 50}" width="${w}" height="5" fill="${railing}" opacity="0.9"/>
    <rect x="${x - 8}" y="${y}" width="${w + 16}" height="26" fill="${t.trim}"/>
    <g>
      <rect x="${x + w - 150}" y="${y - 96}" width="64" height="14" fill="${t.trim}" opacity="0.8"/>
      <rect x="${x + w - 144}" y="${y - 82}" width="8" height="34" fill="${railing}"/>
      <rect x="${x + w - 102}" y="${y - 82}" width="8" height="34" fill="${railing}"/>
      <ellipse cx="${x + w - 118}" cy="${y - 100}" rx="34" ry="12" fill="${tankBody}"/>
      <rect x="${x + w - 152}" y="${y - 126}" width="68" height="26" fill="${tankBody}"/>
      <ellipse cx="${x + w - 118}" cy="${y - 126}" rx="34" ry="12" fill="${mode === 'night' ? '#98A1A6' : '#D2D6D8'}"/>
    </g>
  </g>`;
}

/** A window: reveal, glass, wooden frame, and the metal security grill. */
function window_(t, mode, x, y, w, h, { grill = true, lit = false, mullions = 0 } = {}) {
  const glass = lit ? '#F3C979' : t.glass;
  let bars = '';

  // A wide opening with no divisions reads as a grey slab rather than glazing.
  for (let m = 1; m <= mullions; m++) {
    const mx = x + (w / (mullions + 1)) * m;
    bars += `<rect x="${mx.toFixed(1)}" y="${y}" width="6" height="${h}" fill="${t.frame}"/>`;
  }

  if (grill) {
    for (let i = x + w / 5; i < x + w - 2; i += w / 5) {
      bars += `<rect x="${i.toFixed(1)}" y="${y + 3}" width="2.4" height="${h - 6}" fill="${t.frame}" opacity="0.85"/>`;
    }
    bars += `<rect x="${x + 3}" y="${y + h / 2 - 1}" width="${w - 6}" height="2.4" fill="${t.frame}" opacity="0.85"/>`;
  }

  return `<g>
    <rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" fill="${t.wallDark}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${glass}"/>
    ${lit ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFDFA0" opacity="0.35"/>` : ''}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${t.frame}" stroke-width="5"/>
    ${bars}
  </g>`;
}

/** Balcony slab plus the planters that are on every Kathmandu balcony. */
function balcony(t, mode, x, y, w, { planters = true } = {}) {
  const rail = mode === 'night' ? '#2C333A' : '#57606A';
  let posts = '';
  for (let i = x + 10; i < x + w - 6; i += 22) {
    posts += `<rect x="${i}" y="${y - 42}" width="2.6" height="42" fill="${rail}" opacity="0.9"/>`;
  }

  let pots = '';
  if (planters) {
    for (let i = x + 16; i < x + w - 24; i += 54) {
      pots += `<path d="M${i} ${y - 16} h22 l-3 16 h-16 z" fill="#A9583A"/>
        <circle cx="${i + 11}" cy="${y - 22}" r="9" fill="${mode === 'night' ? '#2F4433' : '#4C7A46'}"/>
        <circle cx="${i + 5}" cy="${y - 26}" r="3" fill="#E0A11B"/>
        <circle cx="${i + 16}" cy="${y - 25}" r="2.6" fill="#E0A11B"/>`;
    }
  }

  return `<g>
    ${posts}
    <rect x="${x}" y="${y - 46}" width="${w}" height="4" fill="${rail}"/>
    ${pots}
    <rect x="${x - 6}" y="${y}" width="${w + 12}" height="14" fill="${t.trim}"/>
    <rect x="${x - 6}" y="${y + 14}" width="${w + 12}" height="5" fill="#000" opacity="0.12"/>
  </g>`;
}

/** Style-specific facade character. */
function detail(t, mode, x, y, w, h) {
  const a = t.accent;

  switch (t.detail) {
    case 'fins': {
      let g = '';
      for (let i = 0; i < 4; i++) {
        const fy = y + 40 + i * 46;
        g += `<rect x="${x + 16}" y="${fy + 9}" width="${w - 32}" height="9" fill="#000" opacity="0.13"/>
          <rect x="${x + 16}" y="${fy}" width="${w - 32}" height="10" fill="${a}" opacity="0.9"/>`;
      }
      return g;
    }
    case 'slats': {
      let g = '';
      for (let i = x + 18; i < x + w - 18; i += 15) {
        g += `<rect x="${i}" y="${y + 24}" width="8" height="${h - 48}" fill="${a}" opacity="0.72"/>`;
      }
      return g;
    }
    case 'louvre': {
      let g = '';
      for (let i = x + 22; i < x + w - 22; i += 26) {
        g += `<rect x="${i}" y="${y + 30}" width="11" height="${h - 60}" fill="${t.trim}" opacity="0.55"/>`;
      }
      return g;
    }
    case 'jali': {
      // Perforated brick screen — the light it throws is half the point.
      let g = '';
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
          g += `<rect x="${x + 26 + c * 22}" y="${y + 34 + r * 22}" width="11" height="11" fill="${mode === 'night' ? '#F2C879' : '#2E241D'}" opacity="${mode === 'night' ? 0.8 : 0.45}"/>`;
        }
      }
      return g;
    }
    case 'jhyal': {
      // Aankhi jhyal: carved timber lattice in a heavy frame.
      let g = `<rect x="${x + 18}" y="${y + 26}" width="${w - 36}" height="${h - 52}" fill="${t.trim}"/>`;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 8; c++) {
          g += `<rect x="${x + 28 + c * 19}" y="${y + 36 + r * 20}" width="10" height="10" fill="${mode === 'night' ? '#F0C070' : '#1E1611'}" opacity="${mode === 'night' ? 0.75 : 0.6}"/>`;
        }
      }
      g += `<rect x="${x + 12}" y="${y + 18}" width="${w - 24}" height="10" fill="${a}" opacity="0.85"/>`;
      return g;
    }
    case 'columns': {
      let g = '';
      // A recess behind the columns is what makes them read as round and
      // standing proud of the wall.
      g += `<rect x="${x + 14}" y="${y + 16}" width="${w - 28}" height="${h - 32}" fill="#000" opacity="0.1"/>`;
      for (const cx of [x + 30, x + w - 62]) {
        g += `<rect x="${cx}" y="${y + 26}" width="32" height="${h - 52}" fill="${t.wall}"/>
          <rect x="${cx + 22}" y="${y + 26}" width="10" height="${h - 52}" fill="#000" opacity="0.12"/>
          <rect x="${cx - 7}" y="${y + 20}" width="46" height="14" fill="${a}"/>
          <rect x="${cx - 7}" y="${y + h - 40}" width="46" height="14" fill="${a}"/>`;
      }
      return g;
    }
    case 'screen': {
      let g = '';
      for (let i = x + 24; i < x + w - 24; i += 13) {
        g += `<rect x="${i}" y="${y + 28}" width="4" height="${h - 56}" fill="${t.trim}" opacity="0.65"/>`;
      }
      return g;
    }
    default:
      return '';
  }
}

/** Compound wall, gate and a strip of marigold. */
function compound(t, mode) {
  const wall = mode === 'night' ? '#3B3F42' : '#D6D1C6';
  const bar = mode === 'night' ? '#20262B' : '#4A5257';
  let bars = '';
  for (let i = 360; i < 700; i += 18) {
    bars += `<rect x="${i}" y="700" width="4" height="86" fill="${bar}"/>`;
  }

  let flowers = '';
  for (let i = 60; i < 1160; i += 34) {
    if (i > 340 && i < 720) continue;
    flowers += `<circle cx="${i}" cy="${800 + (i % 3) * 4}" r="7" fill="${mode === 'night' ? '#6B5A2A' : '#E0A11B'}"/>
      <circle cx="${i + 14}" cy="${808 + (i % 2) * 5}" r="5" fill="${mode === 'night' ? '#2F4433' : '#4C7A46'}"/>`;
  }

  return `<g>
    <rect x="0" y="786" width="${W}" height="20" fill="${mode === 'night' ? '#39362F' : '#9C9484'}"/>
    ${flowers}
    <rect x="0" y="700" width="360" height="92" fill="${wall}"/>
    <rect x="700" y="700" width="500" height="92" fill="${wall}"/>
    ${bars}
    <rect x="352" y="690" width="20" height="102" fill="${wall}"/>
    <rect x="692" y="690" width="20" height="102" fill="${wall}"/>
    <rect x="0" y="806" width="${W}" height="94" fill="${mode === 'night' ? '#2E2C27' : '#8C857A'}"/>
  </g>`;
}

// ---------------------------------------------------------------------------
// The house. One geometry, many treatments — this is what makes the hero
// before/after slider register exactly.
// ---------------------------------------------------------------------------

function house(treatmentId, mode) {
  const t = TREATMENTS[treatmentId];
  const lit = mode === 'night';
  const s = SKY[mode];

  const bx = 250;
  const by = 250;
  const bw = 700;
  const bh = 450;

  const tex =
    t.texture === 'none'
      ? ''
      : `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="url(#${t.texture})"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  ${defs()}
  ${sky(mode)}
  ${neighbours(mode)}
  ${wires(mode)}

  <!-- ground -->
  <rect y="690" width="${W}" height="${H - 690}" fill="${s.ground}"/>

  <!-- main mass -->
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${t.wall}"/>
  ${tex}
  <!-- the recessed bay that gives the elevation some depth -->
  <rect x="${bx + 190}" y="${by + 20}" width="${bw - 380}" height="${bh - 20}" fill="${t.wallDark}"/>
  ${t.texture === 'none' ? '' : `<rect x="${bx + 190}" y="${by + 20}" width="${bw - 380}" height="${bh - 20}" fill="url(#${t.texture})"/>`}

  ${roofline(t, mode, bx, by, bw)}

  <!-- upper floor -->
  ${window_(t, mode, bx + 40, by + 60, 110, 120, { lit })}
  ${window_(t, mode, bx + bw - 150, by + 60, 110, 120, { lit: false })}
  ${detail(t, mode, bx + 190, by + 30, bw - 380, 180)}

  <!-- middle floor with balcony -->
  ${window_(t, mode, bx + 40, by + 230, 110, 120, { lit: false })}
  ${window_(t, mode, bx + bw - 150, by + 230, 110, 120, { lit })}
  <!-- glazed balcony doors first, then the balcony in front of them -->
  ${window_(t, mode, bx + 240, by + 232, 220, 118, { grill: false, lit, mullions: 3 })}
  ${balcony(t, mode, bx + 200, by + 350, bw - 400)}

  <!-- ground floor: entrance -->
  <rect x="${bx + 300}" y="${by + 300}" width="100" height="150" fill="${t.frame}"/>
  <rect x="${bx + 306}" y="${by + 306}" width="88" height="144" fill="${t.accent}" opacity="0.35"/>
  ${lit ? `<circle cx="${bx + 350}" cy="${by + 300}" r="70" fill="url(#lampGlow)"/>` : ''}

  ${compound(t, mode)}
</svg>`;
}

// ---------------------------------------------------------------------------
// Style-card vignettes: a fragment of facade, read as a material sample.
// ---------------------------------------------------------------------------

function vignette(styleId) {
  const t = TREATMENTS[styleId];
  const w = 600;
  const h = 400;
  const tex = t.texture === 'none' ? '' : `<rect width="${w}" height="${h}" fill="url(#${t.texture})"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  ${defs()}
  <rect width="${w}" height="${h}" fill="${t.wall}"/>
  ${tex}
  <rect x="0" y="0" width="${w}" height="46" fill="${t.trim}" opacity="0.55"/>
  <rect x="330" y="46" width="270" height="${h - 46}" fill="${t.wallDark}"/>
  ${t.texture === 'none' ? '' : `<rect x="330" y="46" width="270" height="${h - 46}" fill="url(#${t.texture})"/>`}
  ${window_(t, 'day', 56, 120, 150, 170)}
  ${detail(t, 'day', 330, 60, 260, 300)}
  <rect y="${h - 26}" width="${w}" height="26" fill="#22262B" opacity="0.85"/>
</svg>`;
}

// ---------------------------------------------------------------------------
// Interiors. Phase 2 uses these; they also show the client the direction.
// Every room carries the details the prompts insist on: terrazzo or stone
// underfoot rather than carpet, a grilled window, a ceiling fan.
// ---------------------------------------------------------------------------

const ROOMS = {
  living: { nameEn: 'Living room', floor: '#CFC7B6', wall: '#E8E2D6', accent: '#B07B45' },
  bedroom: { nameEn: 'Bedroom', floor: '#C2B7A4', wall: '#E3DACB', accent: '#8A5C31' },
  kitchen: { nameEn: 'Kitchen', floor: '#BFC2BC', wall: '#EDEAE3', accent: '#5E625F' },
  puja: { nameEn: 'Puja room', floor: '#D6C9AE', wall: '#EFE2C8', accent: '#B98A3E' },
};

function interior(roomId) {
  const r = ROOMS[roomId];
  const w = 1200;
  const h = 800;
  const floorY = 560;

  // Terrazzo speckle — the floor finish that is actually in Nepali homes.
  let speckle = '';
  for (let i = 0; i < 240; i++) {
    const x = (i * 137) % w;
    const y = floorY + ((i * 53) % (h - floorY));
    const rr = 1.5 + ((i * 7) % 3);
    speckle += `<circle cx="${x}" cy="${y}" r="${rr}" fill="#000" opacity="0.07"/>`;
  }

  // The window and the hard directional light it throws across the floor.
  const light = `<path d="M760 ${floorY} L1090 ${floorY} L940 ${h} L520 ${h} Z" fill="#FFF3D6" opacity="0.4"/>`;

  const furniture = {
    living: `
      <rect x="120" y="430" width="330" height="130" rx="8" fill="${r.accent}" opacity="0.85"/>
      <rect x="140" y="400" width="290" height="42" rx="8" fill="${r.accent}"/>
      <rect x="150" y="392" width="80" height="16" rx="6" fill="#E0A11B" opacity="0.7"/>
      <rect x="250" y="392" width="80" height="16" rx="6" fill="#8A4B32" opacity="0.6"/>
      <rect x="500" y="500" width="200" height="14" fill="#5A3A22"/>
      <rect x="520" y="514" width="12" height="46" fill="#5A3A22"/>
      <rect x="668" y="514" width="12" height="46" fill="#5A3A22"/>`,
    bedroom: `
      <rect x="150" y="420" width="420" height="140" rx="6" fill="#D8CEBC"/>
      <rect x="150" y="300" width="420" height="120" rx="6" fill="${r.accent}" opacity="0.8"/>
      <rect x="180" y="400" width="150" height="40" rx="10" fill="#FFFDF7" opacity="0.9"/>
      <rect x="360" y="400" width="150" height="40" rx="10" fill="#FFFDF7" opacity="0.9"/>
      <rect x="600" y="470" width="90" height="90" fill="#5A3A22" opacity="0.75"/>`,
    kitchen: `
      <rect x="120" y="440" width="520" height="26" fill="#2E3338"/>
      <rect x="120" y="466" width="520" height="94" fill="${r.accent}" opacity="0.55"/>
      <rect x="120" y="250" width="300" height="110" fill="${r.accent}" opacity="0.75"/>
      <rect x="300" y="404" width="90" height="36" rx="4" fill="#9AA3A6"/>
      <rect x="150" y="496" width="120" height="6" fill="#F2EFE9" opacity="0.6"/>
      <rect x="330" y="496" width="120" height="6" fill="#F2EFE9" opacity="0.6"/>`,
    puja: `
      <rect x="200" y="300" width="300" height="260" fill="${r.accent}" opacity="0.7"/>
      <path d="M200 300 L350 210 L500 300 Z" fill="${r.accent}"/>
      <rect x="250" y="380" width="200" height="180" fill="#8A5C31"/>
      <rect x="290" y="330" width="120" height="50" fill="#E0A11B" opacity="0.5"/>
      <circle cx="350" cy="420" r="26" fill="#E0A11B" opacity="0.85"/>
      <circle cx="350" cy="420" r="60" fill="url(#lampGlow)"/>
      <rect x="300" y="470" width="100" height="10" fill="#B98A3E"/>`,
  }[roomId];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  ${defs()}
  <rect width="${w}" height="${h}" fill="${r.wall}"/>
  <rect y="0" width="${w}" height="60" fill="#000" opacity="0.05"/>

  <!-- window with a metal grill, and the valley light through it -->
  <rect x="760" y="180" width="330" height="380" fill="#B7C9D2"/>
  <rect x="760" y="180" width="330" height="380" fill="#FFF3D6" opacity="0.35"/>
  <g fill="#6E7679" opacity="0.9">
    <rect x="760" y="180" width="330" height="10"/>
    <rect x="760" y="550" width="330" height="10"/>
    <rect x="760" y="180" width="10" height="380"/>
    <rect x="1080" y="180" width="10" height="380"/>
    <rect x="920" y="180" width="8" height="380"/>
    <rect x="760" y="365" width="330" height="8"/>
  </g>
  <g fill="#5A6165" opacity="0.75">
    <rect x="800" y="190" width="4" height="360"/>
    <rect x="850" y="190" width="4" height="360"/>
    <rect x="980" y="190" width="4" height="360"/>
    <rect x="1030" y="190" width="4" height="360"/>
  </g>

  <!-- floor: terrazzo, never carpet -->
  <rect y="${floorY}" width="${w}" height="${h - floorY}" fill="${r.floor}"/>
  ${speckle}
  ${light}

  ${furniture}

  <!-- ceiling fan, not central air -->
  <rect x="586" y="0" width="10" height="70" fill="#6E7679"/>
  <ellipse cx="591" cy="76" rx="22" ry="12" fill="#6E7679"/>
  <ellipse cx="470" cy="78" rx="130" ry="9" fill="#7C8589" opacity="0.85"/>
  <ellipse cx="712" cy="78" rx="130" ry="9" fill="#7C8589" opacity="0.85"/>

  <rect y="${h - 30}" width="${w}" height="30" fill="#22262B" opacity="0.85"/>
</svg>`;
}

// ---------------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });

const written = [];
const write = (name, svg) => {
  writeFileSync(join(OUT, name), svg);
  written.push(name);
};

// The hero pair: identical geometry, so the slider registers exactly.
write('hero-before.svg', house('bare', 'day'));
write('hero-after.svg', house('brick-courtyard', 'day'));

// A day/night pair, which is what the product actually returns.
write('hero-after-night.svg', house('brick-courtyard', 'night'));

for (const id of Object.keys(TREATMENTS)) {
  if (id === 'bare') continue;
  write(`${id}.svg`, vignette(id));
}

for (const id of Object.keys(ROOMS)) {
  write(`interior-${id}.svg`, interior(id));
}

console.log(`wrote ${written.length} files to web/public/reference/`);
for (const name of written) console.log('  ' + name);
