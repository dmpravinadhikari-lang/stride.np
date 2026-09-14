/**
 * The layout engine: a brief in, a floor plan out.
 *
 * No image model is involved and none should be. A floor plan is geometry —
 * the rooms must total the right area, sit inside the setbacks and not overlap.
 * A diffusion model cannot promise any of that, which is why SPEC §7 already
 * warned against asking one for a plan. Computing it instead makes the result
 * exact, reproducible, unit-testable and free.
 *
 * Rooms are placed with a squarified treemap: it fills a rectangle completely
 * with sub-rectangles of given areas while keeping each close to square. That
 * is a good match for a house — no wasted slivers, rooms in sensible
 * proportions — and it degrades gracefully when the plot is tight.
 *
 * What this deliberately does NOT do: doors, corridors, structural grid,
 * services, or anything an engineer would sign. It is a decision aid, so the
 * customer can see that their brief needs more land, or that four bedrooms on
 * three aana means small bedrooms.
 */
import {
  DEFAULT_SETBACKS,
  ROOM_NORMS,
  type RoomNorm,
} from './norms.ts';
import { describeAreaNepali, toSqFt } from './units.ts';
import type {
  HousePlan,
  LandInput,
  PlannedFloor,
  PlannedRoom,
  RequirementInput,
  RoomKind,
  Setbacks,
} from './types.ts';

/** A little slack over the bare room total, for walls and circulation. */
const CIRCULATION_ALLOWANCE = 1.12;

interface ProgrammeItem {
  kind: RoomKind;
  /** Distinguishes "Bedroom 2" from "Bedroom 3". */
  index?: number;
}

// ---------------------------------------------------------------------------
// Plot geometry
// ---------------------------------------------------------------------------

/**
 * Works out the plot rectangle. A customer usually knows the area but not
 * always the dimensions, so when only the area is given we assume a frontage
 * to depth ratio of 2:3 — deeper than wide, which is the common Kathmandu plot
 * and the conservative assumption for frontage.
 */
export function resolvePlot(land: LandInput): {
  widthFt: number;
  depthFt: number;
  areaSqFt: number;
} {
  const stated = land.area ? toSqFt(land.area.value, land.area.unit) : 0;

  if (land.widthFt && land.depthFt) {
    return {
      widthFt: land.widthFt,
      depthFt: land.depthFt,
      areaSqFt: land.widthFt * land.depthFt,
    };
  }

  if (land.widthFt && stated) {
    return { widthFt: land.widthFt, depthFt: stated / land.widthFt, areaSqFt: stated };
  }

  if (land.depthFt && stated) {
    return { widthFt: stated / land.depthFt, depthFt: land.depthFt, areaSqFt: stated };
  }

  const widthFt = Math.sqrt((stated * 2) / 3);
  return { widthFt, depthFt: stated / widthFt, areaSqFt: stated };
}

// ---------------------------------------------------------------------------
// Programme
// ---------------------------------------------------------------------------

/** Decides what goes on which storey. */
export function buildProgramme(req: RequirementInput): ProgrammeItem[][] {
  const floors = Math.max(1, Math.min(req.floors, 5));
  const bedrooms = Math.max(0, req.bedrooms);
  const attached = Math.max(0, Math.min(req.attachedBathrooms, bedrooms));

  const perFloor: ProgrammeItem[][] = Array.from({ length: floors }, () => []);

  const ground = perFloor[0]!;
  if (req.parkingCars > 0) {
    for (let i = 0; i < req.parkingCars; i++) ground.push({ kind: 'parking', index: i + 1 });
  }
  if (req.living) ground.push({ kind: 'living' });
  if (req.kitchen) ground.push({ kind: 'kitchen' });
  if (req.dining) ground.push({ kind: 'dining' });
  if (req.puja) ground.push({ kind: 'puja' });
  if (req.store) ground.push({ kind: 'store' });

  if (floors === 1) {
    // Everything shares one storey, bedrooms included.
    addBedrooms(ground, bedrooms, attached, 1);
    ground.push({ kind: 'bathroom', index: 99 });
    return perFloor;
  }

  // A stair only exists where there is a storey above to reach.
  for (let level = 0; level < floors - 1; level++) perFloor[level]!.push({ kind: 'stair' });
  ground.push({ kind: 'bathroom', index: 99 });

  // Bedrooms spread over the upper storeys, master on the first of them.
  const upperCount = floors - 1;
  const share = Math.floor(bedrooms / upperCount);
  const extra = bedrooms % upperCount;

  let numbered = 1;
  let attachedLeft = attached;

  for (let u = 0; u < upperCount; u++) {
    const floor = perFloor[u + 1]!;
    const count = share + (u < extra ? 1 : 0);

    for (let b = 0; b < count; b++) {
      const isMaster = numbered === 1;
      floor.push({ kind: isMaster ? 'master' : 'bedroom', index: numbered });
      if (attachedLeft > 0) {
        floor.push({ kind: 'bathroom', index: numbered });
        attachedLeft--;
      }
      numbered++;
    }

    // A common bathroom where some bedroom on this floor lacks its own.
    const bedroomsHere = count;
    const attachedHere = floor.filter((i) => i.kind === 'bathroom').length;
    if (bedroomsHere > attachedHere) floor.push({ kind: 'bathroom', index: 90 + u });

    // Somewhere for the family to sit upstairs, once the house is tall enough.
    if (u === 0 && floors >= 3) floor.push({ kind: 'family' });
  }

  return perFloor;
}

function addBedrooms(
  floor: ProgrammeItem[],
  bedrooms: number,
  attached: number,
  startIndex: number,
): void {
  let attachedLeft = attached;
  for (let b = 0; b < bedrooms; b++) {
    const n = startIndex + b;
    floor.push({ kind: n === 1 ? 'master' : 'bedroom', index: n });
    if (attachedLeft > 0) {
      floor.push({ kind: 'bathroom', index: n });
      attachedLeft--;
    }
  }
}

// ---------------------------------------------------------------------------
// Squarified treemap
// ---------------------------------------------------------------------------

interface Sized {
  key: ProgrammeItem;
  area: number;
}

interface Placed extends Sized {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Fills the rectangle exactly with one sub-rectangle per item, each holding its
 * given area and kept as close to square as the areas allow.
 */
export function squarify(items: Sized[], rect: { x: number; y: number; w: number; h: number }): Placed[] {
  const out: Placed[] = [];
  const rest = [...items].sort((a, b) => b.area - a.area);

  let { x, y, w, h } = rect;

  while (rest.length > 0 && w > 0.01 && h > 0.01) {
    // Rows run along the shorter side; that is what keeps them square-ish.
    const vertical = w >= h;
    const side = vertical ? h : w;

    const row: Sized[] = [];
    let best = Infinity;

    while (rest.length > 0) {
      const next = rest[0]!;
      const ratio = worstRatio([...row, next], side);
      if (row.length === 0 || ratio <= best) {
        best = ratio;
        row.push(next);
        rest.shift();
      } else {
        break;
      }
    }

    const rowArea = row.reduce((sum, item) => sum + item.area, 0);
    const thickness = rowArea / side;
    let cursor = vertical ? y : x;

    for (const item of row) {
      const length = item.area / thickness;
      out.push(
        vertical
          ? { ...item, x, y: cursor, w: thickness, h: length }
          : { ...item, x: cursor, y, w: length, h: thickness },
      );
      cursor += length;
    }

    if (vertical) {
      x += thickness;
      w -= thickness;
    } else {
      y += thickness;
      h -= thickness;
    }
  }

  return out;
}

function worstRatio(row: Sized[], side: number): number {
  const sum = row.reduce((s, r) => s + r.area, 0);
  if (sum <= 0) return Infinity;
  const max = Math.max(...row.map((r) => r.area));
  const min = Math.min(...row.map((r) => r.area));
  const s2 = sum * sum;
  return Math.max((side * side * max) / s2, s2 / (side * side * min));
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export function planHouse(land: LandInput, req: RequirementInput): HousePlan {
  const plot = resolvePlot(land);
  const setbacks: Setbacks = { ...DEFAULT_SETBACKS, ...land.setbacks };
  const warnings: string[] = [];

  const buildableW = plot.widthFt - setbacks.leftFt - setbacks.rightFt;
  const buildableD = plot.depthFt - setbacks.frontFt - setbacks.rearFt;

  if (buildableW <= 6 || buildableD <= 6) {
    return {
      plot: { ...plot, areaLabel: describeAreaNepali(plot.areaSqFt), roadSide: land.roadSide },
      setbacks,
      buildable: { widthFt: Math.max(buildableW, 0), depthFt: Math.max(buildableD, 0), areaSqFt: 0 },
      floors: [],
      totals: { builtUpSqFt: 0, groundCoveragePct: 0, bedrooms: 0, bathrooms: 0 },
      warnings: [
        'After the setbacks there is almost no room left to build on. Reduce the setbacks, or check the plot dimensions.',
      ],
      fits: false,
    };
  }

  const buildableArea = buildableW * buildableD;
  const programme = buildProgramme(req);
  const floors: PlannedFloor[] = [];

  // One footprint for the whole house, sized by its most demanding storey.
  // Upper floors are not redrawn smaller and re-centred: a house is built on
  // one set of walls going up, and a floating first floor would read as wrong
  // to anyone who builds for a living. Storeys with a lighter programme get the
  // slack back as terrace, which is what actually happens here.
  const requiredPerFloor = programme.map((items) =>
    items.reduce((sum, item) => sum + norm(item.kind).targetSqFt, 0),
  );
  const heaviest = Math.max(...requiredPerFloor, 1);

  // A generous plot should not inflate a bathroom to the size of a bedroom, so
  // take only the footprint the programme needs and leave the rest open ground.
  const footprintArea = Math.min(buildableArea, heaviest * CIRCULATION_ALLOWANCE);
  const shrink = Math.sqrt(footprintArea / buildableArea);
  const floorW = buildableW * shrink;
  const floorD = buildableD * shrink;
  const floorArea = floorW * floorD;

  programme.forEach((items, level) => {
    if (items.length === 0) return;

    const required = requiredPerFloor[level]!;

    // Only squeeze when the plot genuinely cannot take the programme.
    const scale = floorArea >= required ? 1 : floorArea / required;

    const sized: Sized[] = items.map((key) => ({
      key,
      area: norm(key.kind).targetSqFt * scale,
    }));

    const used = sized.reduce((sum, item) => sum + item.area, 0);
    const leftover = floorArea - used;

    if (leftover > 45) {
      // Enough spare for a usable terrace or balcony.
      sized.push({ key: { kind: 'terrace' }, area: leftover });
    } else if (leftover > 0 && used > 0) {
      // A sliver: hand it back to the rooms rather than draw a token terrace.
      const spread = floorArea / used;
      for (const item of sized) item.area *= spread;
    }

    const placed = squarify(sized, { x: 0, y: 0, w: floorW, h: floorD });

    const rooms: PlannedRoom[] = placed.map((p) => {
      const n = norm(p.key.kind);
      const areaSqFt = p.w * p.h;
      const aspect = Math.max(p.w, p.h) / Math.max(Math.min(p.w, p.h), 0.01);

      if (aspect > n.maxAspect + 0.6) {
        warnings.push(
          `${label(p.key, n)} on ${floorName(level).en.toLowerCase()} comes out long and narrow. A different plot proportion or fewer rooms on that floor would help.`,
        );
      }

      // Snap to a 0.1 ft grid by rounding the EDGES, not the position and size
      // independently. Rounding w and h separately lets two rooms that shared
      // an exact edge end up overlapping by up to a tenth of a foot, which
      // then draws as a doubled wall.
      const x = round(p.x);
      const y = round(p.y);

      return {
        id: `${level}-${p.key.kind}-${p.key.index ?? 0}`,
        kind: p.key.kind,
        nameEn: label(p.key, n),
        nameNe: n.nameNe,
        x,
        y,
        w: round(p.x + p.w) - x,
        h: round(p.y + p.h) - y,
        areaSqFt: Math.round(areaSqFt),
        tight: areaSqFt < n.minSqFt,
      };
    });

    floors.push({
      level,
      nameEn: floorName(level).en,
      nameNe: floorName(level).ne,
      rooms,
      areaSqFt: Math.round(floorW * floorD),
    });
  });

  const tight = floors.flatMap((f) => f.rooms.filter((r) => r.tight));
  if (tight.length > 0) {
    const names = [...new Set(tight.map((r) => r.nameEn))].slice(0, 4).join(', ');
    warnings.push(
      `On this plot these come out smaller than is comfortable: ${names}. Either the plot needs to be bigger, or the house needs a storey more, or one of the rooms has to go.`,
    );
  }

  const groundArea = floors[0]?.areaSqFt ?? 0;
  const builtUp = floors.reduce((sum, f) => sum + f.areaSqFt, 0);

  return {
    plot: { ...plot, areaLabel: describeAreaNepali(plot.areaSqFt), roadSide: land.roadSide },
    setbacks,
    buildable: { widthFt: round(buildableW), depthFt: round(buildableD), areaSqFt: Math.round(buildableArea) },
    floors,
    totals: {
      builtUpSqFt: builtUp,
      groundCoveragePct: Math.round((groundArea / plot.areaSqFt) * 100),
      bedrooms: floors.flatMap((f) => f.rooms).filter((r) => r.kind === 'bedroom' || r.kind === 'master').length,
      bathrooms: floors.flatMap((f) => f.rooms).filter((r) => r.kind === 'bathroom').length,
    },
    warnings: [...new Set(warnings)],
    fits: tight.length === 0,
  };
}

function norm(kind: RoomKind): RoomNorm {
  return ROOM_NORMS[kind];
}

function label(item: ProgrammeItem, n: RoomNorm): string {
  if (item.kind === 'bedroom' && item.index) return `Bedroom ${item.index}`;
  if (item.kind === 'bathroom') return 'Bathroom';
  if (item.kind === 'parking' && item.index && item.index > 1) return `Parking ${item.index}`;
  return n.nameEn;
}

function floorName(level: number): { en: string; ne: string } {
  if (level === 0) return { en: 'Ground floor', ne: 'भुइँ तला' };
  if (level === 1) return { en: 'First floor', ne: 'पहिलो तला' };
  if (level === 2) return { en: 'Second floor', ne: 'दोस्रो तला' };
  if (level === 3) return { en: 'Third floor', ne: 'तेस्रो तला' };
  return { en: `Floor ${level}`, ne: `${level} तला` };
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}
