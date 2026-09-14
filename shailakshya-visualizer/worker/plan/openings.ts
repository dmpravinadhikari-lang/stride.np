/**
 * Doors, windows and columns for a computed floor.
 *
 * The layout engine tiles a footprint into rooms. That answers "does it fit",
 * which is the commercial question, but it draws a house nobody can walk
 * through: sealed boxes with no way in, no daylight and no structure. A
 * customer reading it cannot tell where the front door is, which rooms face
 * the road, or where the columns land — and columns are the thing that decides
 * whether a room can be opened up later, in a country that builds almost
 * everything as an RCC frame with brick infill.
 *
 * Everything here is derived from the room rectangles, deterministically. No
 * model runs, so it is free, instant, identical for the same brief, and
 * testable — the same reasons the layout itself is computed rather than
 * generated.
 *
 * It is still not a construction drawing. Door swings are conventional, window
 * sizes are typical rather than calculated for daylight or ventilation, and
 * the column grid follows the walls rather than a structural analysis. The
 * drawing says so on its face.
 */
import type { PlannedFloor, PlannedRoom, RoomKind } from './types.ts';

/** Rooms are snapped to a 0.1 ft grid, so anything under that is one edge. */
const EPS = 0.15;

/** Below this a shared wall is a corner touch, not a place to put a door. */
const MIN_SHARED_FT = 3;

/** Clear space kept at each end of a wall so a leaf is not jammed in a corner. */
const JAMB_FT = 0.75;

/** 9 inches square — the ordinary residential column in the valley. */
const COLUMN_FT = 0.75;

/** Two columns closer than this are the same junction seen twice. */
const COLUMN_MERGE_FT = 2.5;

export interface Opening {
  kind: 'door' | 'entry' | 'shutter' | 'window';
  /** The wall's run: 'h' spans left to right, 'v' spans top to bottom. */
  axis: 'h' | 'v';
  /** Start corner of the opening, in footprint feet. */
  x: number;
  y: number;
  lenFt: number;
  /** Doors only: which end the leaf hinges on, and which side it opens to. */
  hingeAtStart: boolean;
  /** Doors only: -1 opens towards smaller x/y, +1 towards larger. */
  swing: -1 | 1;
}

export interface Column {
  x: number;
  y: number;
  sizeFt: number;
}

export interface FloorOpenings {
  doors: Opening[];
  windows: Opening[];
  columns: Column[];
}

/** Door leaf widths, in feet. Narrow where the code and habit allow it. */
function doorWidth(kind: RoomKind): number {
  if (kind === 'bathroom' || kind === 'store') return 2.25;
  if (kind === 'puja') return 2.5;
  return 2.75;
}

/** Which room the front door should open into, best first. */
const ENTRY_PREFERENCE: RoomKind[] = ['living', 'family', 'dining', 'stair', 'kitchen'];

interface SharedWall {
  /** The room the wall is approached from. */
  from: PlannedRoom;
  /** The room the door leads into. */
  into: PlannedRoom;
  axis: 'h' | 'v';
  /** Constant coordinate of the wall: x for 'v', y for 'h'. */
  at: number;
  /** Span of the shared run along the wall. */
  start: number;
  end: number;
}

/** Every pair of rooms that share enough wall to hold a door. */
function sharedWalls(rooms: PlannedRoom[]): SharedWall[] {
  const out: SharedWall[] = [];

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const pair = [
        [rooms[i], rooms[j]],
        [rooms[j], rooms[i]],
      ] as const;

      for (const [p, q] of pair) {
        if (!p || !q) continue;

        // p's right edge against q's left edge.
        if (Math.abs(p.x + p.w - q.x) < EPS) {
          const start = Math.max(p.y, q.y);
          const end = Math.min(p.y + p.h, q.y + q.h);
          if (end - start >= MIN_SHARED_FT) {
            out.push({ from: p, into: q, axis: 'v', at: q.x, start, end });
            out.push({ from: q, into: p, axis: 'v', at: q.x, start, end });
          }
        }

        // p's bottom edge against q's top edge.
        if (Math.abs(p.y + p.h - q.y) < EPS) {
          const start = Math.max(p.x, q.x);
          const end = Math.min(p.x + p.w, q.x + q.w);
          if (end - start >= MIN_SHARED_FT) {
            out.push({ from: p, into: q, axis: 'h', at: q.y, start, end });
            out.push({ from: q, into: p, axis: 'h', at: q.y, start, end });
          }
        }
      }
    }
  }

  return out;
}

/** Where along a shared run the leaf sits: near a corner, or centred if tight. */
function placeAlong(wall: SharedWall, width: number): number {
  const span = wall.end - wall.start;
  if (span < width + JAMB_FT * 2) return wall.start + Math.max((span - width) / 2, 0);
  return wall.start + JAMB_FT;
}

function doorOn(wall: SharedWall, width: number, kind: Opening['kind']): Opening {
  const at = placeAlong(wall, width);

  // The leaf swings into the room being entered, which is the convention and
  // also keeps it out of the circulation it was reached from.
  const swing: -1 | 1 =
    wall.axis === 'v'
      ? wall.into.x >= wall.at - EPS
        ? 1
        : -1
      : wall.into.y >= wall.at - EPS
        ? 1
        : -1;

  return wall.axis === 'v'
    ? { kind, axis: 'v', x: wall.at, y: at, lenFt: width, hingeAtStart: true, swing }
    : { kind, axis: 'h', x: at, y: wall.at, lenFt: width, hingeAtStart: true, swing };
}

/**
 * One door per room, laid out as a spanning tree from the circulation core.
 *
 * A tree is the honest minimum: every room reachable, no room given two doors
 * it does not need. Walking out from the stair (or the living room, on a floor
 * without one) also produces the arrangement a person would draw — you reach
 * the bathroom through the bedroom, not the other way round.
 */
function interiorDoors(rooms: PlannedRoom[], walls: SharedWall[]): Opening[] {
  const byRoom = new Map<string, SharedWall[]>();
  for (const wall of walls) {
    const list = byRoom.get(wall.from.id) ?? [];
    list.push(wall);
    byRoom.set(wall.from.id, list);
  }

  const core =
    rooms.find((r) => r.kind === 'stair') ??
    rooms.find((r) => r.kind === 'living') ??
    rooms[0];
  if (!core) return [];

  const doors: Opening[] = [];
  const seen = new Set<string>([core.id]);
  const queue: PlannedRoom[] = [core];

  while (queue.length) {
    const room = queue.shift();
    if (!room) break;

    // Widest shared run first, so a room is entered off its main wall rather
    // than through the sliver it happens to touch in a corner.
    const options = (byRoom.get(room.id) ?? [])
      .slice()
      .sort((a, b) => b.end - b.start - (a.end - a.start));

    for (const wall of options) {
      if (seen.has(wall.into.id)) continue;
      seen.add(wall.into.id);
      doors.push(doorOn(wall, doorWidth(wall.into.kind), 'door'));
      queue.push(wall.into);
    }
  }

  // A room the tree could not reach — an island created by the tiling — still
  // needs a way in. Give it its widest wall to anywhere rather than sealing it.
  for (const room of rooms) {
    if (seen.has(room.id)) continue;
    const best = (byRoom.get(room.id) ?? []).sort(
      (a, b) => b.end - b.start - (a.end - a.start),
    )[0];
    if (best) doors.push(doorOn(best, doorWidth(room.kind), 'door'));
  }

  return doors;
}

/**
 * The way in from the street.
 *
 * The drawing puts the road-side setback at the top, so the front wall is
 * y = 0 whichever compass direction the road actually runs along.
 */
function frontOpenings(rooms: PlannedRoom[], footprintW: number): Opening[] {
  const atFront = rooms.filter((r) => r.y < EPS && r.w >= MIN_SHARED_FT);
  if (atFront.length === 0) return [];

  const out: Opening[] = [];

  // Parking on the front gets a shutter. That is what is actually built, and
  // it is most of the frontage on a narrow plot.
  const parking = atFront.find((r) => r.kind === 'parking');
  if (parking) {
    const width = Math.min(8, parking.w - JAMB_FT * 2);
    if (width >= 5) {
      out.push({
        kind: 'shutter',
        axis: 'h',
        x: parking.x + (parking.w - width) / 2,
        y: 0,
        lenFt: width,
        hingeAtStart: true,
        swing: 1,
      });
    }
  }

  const rank = (room: PlannedRoom) => {
    const index = ENTRY_PREFERENCE.indexOf(room.kind);
    return index === -1 ? ENTRY_PREFERENCE.length : index;
  };

  const door = atFront
    .filter((r) => r.kind !== 'parking' && r.kind !== 'terrace' && r.kind !== 'bathroom')
    .sort((a, b) => rank(a) - rank(b) || b.w - a.w)[0];

  if (door) {
    const width = Math.min(3.5, door.w - JAMB_FT * 2);
    if (width >= 2.5) {
      out.push({
        kind: 'entry',
        axis: 'h',
        x: Math.min(door.x + JAMB_FT, footprintW - width),
        y: 0,
        lenFt: width,
        hingeAtStart: true,
        swing: 1,
      });
    }
  }

  return out;
}

/** How wide a window that room can carry, and how many. */
function windowWidth(kind: RoomKind, spanFt: number): number {
  const cap = kind === 'bathroom' ? 2.5 : kind === 'store' || kind === 'stair' ? 3 : 6;
  return Math.min(cap, Math.max(2.5, spanFt * 0.45));
}

/** Openings already on this stretch of wall, so a window is not cut over a door. */
function clashes(existing: Opening[], candidate: Opening): boolean {
  return existing.some((other) => {
    if (other.axis !== candidate.axis) return false;
    if (candidate.axis === 'h') {
      if (Math.abs(other.y - candidate.y) > EPS) return false;
      return other.x < candidate.x + candidate.lenFt + 1 && candidate.x < other.x + other.lenFt + 1;
    }
    if (Math.abs(other.x - candidate.x) > EPS) return false;
    return other.y < candidate.y + candidate.lenFt + 1 && candidate.y < other.y + other.lenFt + 1;
  });
}

/**
 * A window on every exterior wall a room has.
 *
 * Which rooms face the road, and which get morning light, is one of the first
 * things anybody asks of a plan, and a sealed rectangle cannot answer it.
 */
function windows(
  rooms: PlannedRoom[],
  footprintW: number,
  footprintD: number,
  doors: Opening[],
): Opening[] {
  const out: Opening[] = [];

  for (const room of rooms) {
    // A terrace is open to the sky and parking is open to the street.
    if (room.kind === 'terrace' || room.kind === 'parking') continue;

    const edges: Array<{ axis: 'h' | 'v'; at: number; start: number; span: number }> = [];
    if (room.y < EPS) edges.push({ axis: 'h', at: 0, start: room.x, span: room.w });
    if (Math.abs(room.y + room.h - footprintD) < EPS)
      edges.push({ axis: 'h', at: footprintD, start: room.x, span: room.w });
    if (room.x < EPS) edges.push({ axis: 'v', at: 0, start: room.y, span: room.h });
    if (Math.abs(room.x + room.w - footprintW) < EPS)
      edges.push({ axis: 'v', at: footprintW, start: room.y, span: room.h });

    for (const edge of edges) {
      if (edge.span < 4) continue;

      const width = windowWidth(room.kind, edge.span);
      // A long wall carries two rather than one enormous sheet of glass.
      const count = edge.span >= 15 && room.kind !== 'bathroom' ? 2 : 1;

      for (let i = 0; i < count; i++) {
        const slot = edge.span / count;
        const at = edge.start + slot * i + (slot - width) / 2;
        const candidate: Opening =
          edge.axis === 'h'
            ? { kind: 'window', axis: 'h', x: at, y: edge.at, lenFt: width, hingeAtStart: true, swing: 1 }
            : { kind: 'window', axis: 'v', x: edge.at, y: at, lenFt: width, hingeAtStart: true, swing: 1 };

        if (!clashes(doors, candidate) && !clashes(out, candidate)) out.push(candidate);
      }
    }
  }

  return out;
}

/**
 * The column grid.
 *
 * Every room corner is a wall junction, and a wall junction is where a frame
 * carries load, so the corners are the grid. Duplicates and near-duplicates
 * collapse, which turns a tiled floor into the handful of positions a builder
 * would actually set out.
 */
function columns(rooms: PlannedRoom[], footprintW: number, footprintD: number): Column[] {
  const candidates: Array<{ x: number; y: number }> = [
    { x: 0, y: 0 },
    { x: footprintW, y: 0 },
    { x: 0, y: footprintD },
    { x: footprintW, y: footprintD },
  ];

  for (const room of rooms) {
    if (room.kind === 'terrace') continue;
    candidates.push(
      { x: room.x, y: room.y },
      { x: room.x + room.w, y: room.y },
      { x: room.x, y: room.y + room.h },
      { x: room.x + room.w, y: room.y + room.h },
    );
  }

  // Deterministic order, so the same plan always sets out the same grid.
  candidates.sort((a, b) => a.y - b.y || a.x - b.x);

  const kept: Column[] = [];
  for (const point of candidates) {
    if (point.x < -EPS || point.y < -EPS) continue;
    if (point.x > footprintW + EPS || point.y > footprintD + EPS) continue;
    const near = kept.some(
      (other) =>
        Math.abs(other.x - point.x) < COLUMN_MERGE_FT &&
        Math.abs(other.y - point.y) < COLUMN_MERGE_FT,
    );
    if (!near) kept.push({ x: point.x, y: point.y, sizeFt: COLUMN_FT });
  }

  return kept;
}

export function computeOpenings(floor: PlannedFloor): FloorOpenings {
  const rooms = floor.rooms;
  if (rooms.length === 0) return { doors: [], windows: [], columns: [] };

  const footprintW = Math.max(...rooms.map((r) => r.x + r.w));
  const footprintD = Math.max(...rooms.map((r) => r.y + r.h));

  const walls = sharedWalls(rooms);
  const doors = [
    ...frontOpenings(rooms, footprintW),
    ...interiorDoors(rooms, walls),
  ];

  return {
    doors,
    windows: windows(rooms, footprintW, footprintD, doors),
    columns: columns(rooms, footprintW, footprintD),
  };
}
