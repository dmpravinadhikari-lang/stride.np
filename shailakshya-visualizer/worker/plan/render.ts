/**
 * Draws a computed floor as an SVG plan.
 *
 * Vector rather than raster, for three reasons: it stays sharp when a customer
 * pinches to zoom on a phone, it prints legibly if they take it to a meeting,
 * and it is a few kilobytes rather than a few hundred.
 *
 * The drawing is deliberately plain — walls, rooms, names, areas, dimensions,
 * a north arrow and a scale bar. It is a decision aid, not a construction
 * drawing, and it says so on its face. That notice matters far more here than
 * on a styled render: a render obviously flatters, whereas a dimensioned plan
 * looks like something you could hand to a mason, and it is not.
 */
import type { HousePlan, PlannedFloor, RoomKind } from './types.ts';

const INK = '#22262B';
const PAPER = '#F2EFE9';
const DUST = '#C9C2B6';
const MARIGOLD = '#E0A11B';
const FAINT = '#7B8087';

/** Drawn wall thickness, in feet. */
const WALL_FT = 0.5;

const FILLS: Partial<Record<RoomKind, string>> = {
  bathroom: '#DCE3E4',
  kitchen: '#E4E6DF',
  parking: '#D8D6D0',
  stair: '#E7E2D8',
  puja: '#F0E6D2',
  terrace: 'none',
};

export interface RenderOptions {
  /** Drawing width in px. Height follows the plot proportion. */
  width?: number;
  /** Show the plot boundary and setback lines around the footprint. */
  showPlot?: boolean;
}

export function renderFloorSvg(
  plan: HousePlan,
  floor: PlannedFloor,
  options: RenderOptions = {},
): string {
  const width = options.width ?? 900;
  const showPlot = options.showPlot ?? true;

  // Everything is drawn in plot coordinates, then scaled once.
  const plotW = plan.plot.widthFt;
  const plotD = plan.plot.depthFt;

  const margin = 58;
  const scale = (width - margin * 2) / plotW;
  const height = plotD * scale + margin * 2 + 54;

  const px = (ft: number) => ft * scale;

  // The footprint sits against the front setback, centred left to right —
  // which is what actually gets built when the plot is wider than the house.
  const footprintW = Math.max(...floor.rooms.map((r) => r.x + r.w), 0);
  const footprintD = Math.max(...floor.rooms.map((r) => r.y + r.h), 0);
  const offsetX = plan.setbacks.leftFt + (plan.buildable.widthFt - footprintW) / 2;
  const offsetY = plan.setbacks.frontFt;

  const X = (ft: number) => margin + px(ft);
  const Y = (ft: number) => margin + px(ft);

  const parts: string[] = [];

  // Plot boundary and the setback line inside it.
  if (showPlot) {
    parts.push(
      `<rect x="${X(0)}" y="${Y(0)}" width="${px(plotW)}" height="${px(plotD)}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="9 5"/>`,
      `<rect x="${X(plan.setbacks.leftFt)}" y="${Y(plan.setbacks.frontFt)}" width="${px(plan.buildable.widthFt)}" height="${px(plan.buildable.depthFt)}" fill="none" stroke="${DUST}" stroke-width="1.2" stroke-dasharray="4 4"/>`,
      `<text x="${X(0) + 4}" y="${Y(0) - 8}" font-size="12" fill="${FAINT}" font-family="system-ui,sans-serif">Plot boundary · ${plotW.toFixed(0)}′ × ${plotD.toFixed(0)}′</text>`,
    );
  }

  // Footprint slab under the rooms, so the outer wall reads as solid.
  parts.push(
    `<rect x="${X(offsetX)}" y="${Y(offsetY)}" width="${px(footprintW)}" height="${px(footprintD)}" fill="${PAPER}" stroke="${INK}" stroke-width="4" stroke-linejoin="miter"/>`,
  );

  for (const room of floor.rooms) {
    const rx = X(offsetX + room.x);
    const ry = Y(offsetY + room.y);
    const rw = px(room.w);
    const rh = px(room.h);

    // A terrace is open to the sky, so it is drawn as an outline rather than a
    // walled room.
    const open = room.kind === 'terrace';
    parts.push(
      `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${open ? 'none' : (FILLS[room.kind] ?? PAPER)}" stroke="${INK}" stroke-width="${open ? 1.4 : Math.max(px(WALL_FT), 1.6)}"${open ? ' stroke-dasharray="6 4"' : ''} stroke-linejoin="miter"/>`,
    );

    if (room.kind === 'stair') parts.push(stairSymbol(rx, ry, rw, rh));

    parts.push(roomLabel(room.nameEn, room.nameNe, room.areaSqFt, room.w, room.h, rx, ry, rw, rh, room.tight));
  }

  // Overall dimensions along the bottom and the left.
  parts.push(
    dimensionH(X(offsetX), X(offsetX + footprintW), Y(offsetY + footprintD) + 22, `${footprintW.toFixed(1)}′`),
    dimensionV(Y(offsetY), Y(offsetY + footprintD), X(offsetX) - 22, `${footprintD.toFixed(1)}′`),
  );

  parts.push(northArrow(width - margin - 14, margin + 16, plan.plot.roadSide));
  parts.push(scaleBar(margin, height - 62, scale));

  parts.push(
    `<text x="${margin}" y="${height - 30}" font-size="15" font-weight="600" fill="${INK}" font-family="system-ui,sans-serif">${esc(floor.nameEn)} · ${floor.areaSqFt} sq ft</text>`,
    `<text x="${margin}" y="${height - 12}" font-size="12.5" fill="${FAINT}" font-family="system-ui,sans-serif">Indicative layout only — not a construction drawing. यो नक्सा सुझाव मात्र हो — निर्माण नक्सा होइन।</text>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(height)}" viewBox="0 0 ${width} ${Math.round(height)}" role="img" aria-label="${esc(floor.nameEn)} plan">
  <rect width="${width}" height="${Math.round(height)}" fill="${PAPER}"/>
  ${parts.join('\n  ')}
</svg>`;
}

function roomLabel(
  nameEn: string,
  nameNe: string,
  area: number,
  wFt: number,
  hFt: number,
  x: number,
  y: number,
  w: number,
  h: number,
  tight: boolean,
): string {
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Below this there is no room for text without it colliding with the walls.
  if (w < 40 || h < 24) return '';

  // Rooms are often narrower than their label. Rather than let text run over
  // the walls, each line is measured and dropped or shortened to fit. A
  // bathroom is 4 ft wide and its dimension string is not.
  const fits = (text: string, size: number) => textWidth(text, size) <= w - 10;

  const nameSize = w < 78 ? 11 : 13;
  if (!fits(nameEn, nameSize)) {
    // Even the name will not fit; a lone area figure is better than nothing.
    return fits(`${area}`, 10)
      ? `<text x="${cx}" y="${cy + 3}" text-anchor="middle" font-size="10" fill="${FAINT}" font-family="system-ui,sans-serif">${area} sq ft</text>`
      : '';
  }

  const detail = `${wFt.toFixed(1)}′ × ${hFt.toFixed(1)}′ · ${area} sq ft`;
  const shortDetail = `${area} sq ft`;
  const detailText = fits(detail, 11) ? detail : fits(shortDetail, 11) ? shortDetail : '';
  const showDetail = h > 50 && detailText !== '';
  const showNepali = h > 74 && fits(nameNe, 11);

  const nameY = cy - (showDetail && showNepali ? 12 : showDetail ? 4 : 4);

  const lines: string[] = [
    `<text x="${cx}" y="${nameY}" text-anchor="middle" font-size="${nameSize}" font-weight="600" fill="${INK}" font-family="system-ui,sans-serif">${esc(nameEn)}</text>`,
  ];

  if (showDetail) {
    lines.push(
      `<text x="${cx}" y="${nameY + 15}" text-anchor="middle" font-size="11" fill="${FAINT}" font-family="system-ui,sans-serif">${detailText}</text>`,
    );
  }

  if (showNepali && showDetail) {
    lines.push(
      `<text x="${cx}" y="${nameY + 32}" text-anchor="middle" font-size="11" fill="${FAINT}" font-family="'Mukta','Noto Sans Devanagari',system-ui,sans-serif">${esc(nameNe)}</text>`,
    );
  }

  // Flagged in the accent colour, and explained in the warnings list beside the
  // drawing — a small room is the single most useful thing to surface early.
  if (tight) {
    lines.push(
      `<circle cx="${x + 11}" cy="${y + 11}" r="4.5" fill="${MARIGOLD}"/>`,
    );
  }

  return lines.join('\n  ');
}

function stairSymbol(x: number, y: number, w: number, h: number): string {
  const treads: string[] = [];
  const along = h >= w;
  const count = Math.max(4, Math.floor((along ? h : w) / 11));

  for (let i = 1; i < count; i++) {
    const t = (i / count) * (along ? h : w);
    treads.push(
      along
        ? `<line x1="${x + 3}" y1="${y + t}" x2="${x + w - 3}" y2="${y + t}" stroke="${FAINT}" stroke-width="1"/>`
        : `<line x1="${x + t}" y1="${y + 3}" x2="${x + t}" y2="${y + h - 3}" stroke="${FAINT}" stroke-width="1"/>`,
    );
  }

  // Arrow marking the up direction. Kept to one side so it does not run
  // through the room label sitting in the middle.
  const ax = along ? x + w - 12 : x + w / 2;
  const ay = along ? y + h / 2 : y + h - 12;
  treads.push(
    along
      ? `<path d="M${ax} ${y + h - 10} L${ax} ${y + 10} M${ax - 4} ${y + 16} L${ax} ${y + 10} L${ax + 4} ${y + 16}" stroke="${INK}" stroke-width="1.4" fill="none"/>`
      : `<path d="M${x + 10} ${ay} L${x + w - 10} ${ay} M${x + w - 16} ${ay - 4} L${x + w - 10} ${ay} L${x + w - 16} ${ay + 4}" stroke="${INK}" stroke-width="1.4" fill="none"/>`,
  );

  return treads.join('\n  ');
}

function dimensionH(x1: number, x2: number, y: number, label: string): string {
  return `<g stroke="${FAINT}" stroke-width="1" fill="none">
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>
    <line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}"/>
    <line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}"/>
  </g>
  <text x="${(x1 + x2) / 2}" y="${y - 6}" text-anchor="middle" font-size="12" fill="${FAINT}" font-family="system-ui,sans-serif">${label}</text>`;
}

function dimensionV(y1: number, y2: number, x: number, label: string): string {
  return `<g stroke="${FAINT}" stroke-width="1" fill="none">
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>
    <line x1="${x - 4}" y1="${y1}" x2="${x + 4}" y2="${y1}"/>
    <line x1="${x - 4}" y1="${y2}" x2="${x + 4}" y2="${y2}"/>
  </g>
  <text x="${x - 7}" y="${(y1 + y2) / 2}" text-anchor="middle" font-size="12" fill="${FAINT}" font-family="system-ui,sans-serif" transform="rotate(-90 ${x - 7} ${(y1 + y2) / 2})">${label}</text>`;
}

/**
 * The plan is drawn with the road at the bottom, so north depends on which edge
 * the customer said the road runs along.
 */
function northArrow(x: number, y: number, roadSide: string): string {
  const rotation: Record<string, number> = { south: 0, north: 180, east: 90, west: 270 };
  const angle = rotation[roadSide] ?? 0;

  return `<g transform="translate(${x} ${y}) rotate(${angle})">
    <path d="M0 -15 L6 8 L0 3 L-6 8 Z" fill="${INK}"/>
    <text x="0" y="21" text-anchor="middle" font-size="11" font-weight="600" fill="${INK}" font-family="system-ui,sans-serif">N</text>
  </g>`;
}

function scaleBar(x: number, y: number, scale: number): string {
  const tenFt = 10 * scale;
  return `<g>
    <rect x="${x}" y="${y}" width="${tenFt}" height="6" fill="${INK}"/>
    <rect x="${x + tenFt}" y="${y}" width="${tenFt}" height="6" fill="none" stroke="${INK}" stroke-width="1"/>
    <text x="${x}" y="${y - 5}" font-size="11" fill="${FAINT}" font-family="system-ui,sans-serif">0</text>
    <text x="${x + tenFt * 2}" y="${y - 5}" text-anchor="middle" font-size="11" fill="${FAINT}" font-family="system-ui,sans-serif">20 ft</text>
  </g>`;
}

/**
 * Rough text width in px. system-ui averages a little over half the font size
 * per character for mixed case; an over-estimate is the safe direction here,
 * since the cost of guessing high is a dropped label and of guessing low is
 * text printed across a wall.
 */
function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.56;
}

function esc(value: string): string {
  return value.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] ?? c);
}
