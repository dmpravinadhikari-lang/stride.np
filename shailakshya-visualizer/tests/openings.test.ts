/**
 * Doors, windows and columns.
 *
 * The property that matters most is reachability: a plan where one room has no
 * door is worse than a plan with no doors at all, because it looks finished
 * and is wrong. Most of these tests are about that, and about openings landing
 * in walls that exist rather than in mid-air.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeOpenings } from '../worker/plan/openings.ts';
import { planHouse } from '../worker/plan/layout.ts';
import type { PlannedFloor, PlannedRoom, RoomKind } from '../worker/plan/types.ts';

function room(
  id: string,
  kind: RoomKind,
  x: number,
  y: number,
  w: number,
  h: number,
): PlannedRoom {
  return {
    id,
    kind,
    nameEn: id,
    nameNe: id,
    x,
    y,
    w,
    h,
    areaSqFt: Math.round(w * h),
    tight: false,
  };
}

function floor(rooms: PlannedRoom[]): PlannedFloor {
  return { level: 0, nameEn: 'Ground floor', nameNe: 'भुइँ तला', rooms, areaSqFt: 0 };
}

/** Four rooms in a 24 × 24 square, every one touching the middle cross. */
const QUAD = floor([
  room('a', 'living', 0, 0, 12, 12),
  room('b', 'stair', 12, 0, 12, 12),
  room('c', 'kitchen', 0, 12, 12, 12),
  room('d', 'bedroom', 12, 12, 12, 12),
]);

test('every room can be reached through a door', () => {
  const { doors } = computeOpenings(QUAD);
  const touched = new Set<string>();

  for (const door of doors) {
    for (const r of QUAD.rooms) {
      // An opening belongs to a room when it lies on that room's boundary.
      const onV =
        door.axis === 'v' &&
        (Math.abs(door.x - r.x) < 0.2 || Math.abs(door.x - (r.x + r.w)) < 0.2) &&
        door.y >= r.y - 0.2 &&
        door.y + door.lenFt <= r.y + r.h + 0.2;
      const onH =
        door.axis === 'h' &&
        (Math.abs(door.y - r.y) < 0.2 || Math.abs(door.y - (r.y + r.h)) < 0.2) &&
        door.x >= r.x - 0.2 &&
        door.x + door.lenFt <= r.x + r.w + 0.2;
      if (onV || onH) touched.add(r.id);
    }
  }

  assert.deepEqual([...touched].sort(), ['a', 'b', 'c', 'd']);
});

test('the front door lands on the road-side wall, not inside the house', () => {
  const { doors } = computeOpenings(QUAD);
  const entry = doors.find((d) => d.kind === 'entry');
  assert.ok(entry, 'expected a front door');
  // The drawing puts the road at the top, so the front wall is y = 0.
  assert.equal(entry.y, 0);
  assert.equal(entry.axis, 'h');
});

test('the front door prefers the living room over the stair', () => {
  const { doors } = computeOpenings(QUAD);
  const entry = doors.find((d) => d.kind === 'entry');
  // Living occupies x 0–12; the stair is 12–24.
  assert.ok(entry && entry.x < 12, `entry at x=${entry?.x} should open into the living room`);
});

test('parking on the frontage gets a shutter', () => {
  const withParking = floor([
    room('p', 'parking', 0, 0, 11, 18),
    room('l', 'living', 11, 0, 13, 18),
  ]);
  const { doors } = computeOpenings(withParking);
  const shutter = doors.find((d) => d.kind === 'shutter');
  assert.ok(shutter, 'expected a shutter');
  assert.equal(shutter.y, 0);
  assert.ok(shutter.lenFt >= 5 && shutter.lenFt <= 8);
  // And a person can still get in without going through the garage.
  assert.ok(doors.some((d) => d.kind === 'entry'));
});

test('windows only appear on exterior walls', () => {
  const { windows } = computeOpenings(QUAD);
  assert.ok(windows.length > 0);
  for (const w of windows) {
    const onEdge =
      w.axis === 'h'
        ? Math.abs(w.y) < 0.2 || Math.abs(w.y - 24) < 0.2
        : Math.abs(w.x) < 0.2 || Math.abs(w.x - 24) < 0.2;
    assert.ok(onEdge, `window at ${w.x},${w.y} is not on the footprint boundary`);
  }
});

test('a window is never cut through a door', () => {
  const { doors, windows } = computeOpenings(QUAD);
  for (const w of windows) {
    for (const d of doors) {
      if (w.axis !== d.axis) continue;
      const sameWall =
        w.axis === 'h' ? Math.abs(w.y - d.y) < 0.2 : Math.abs(w.x - d.x) < 0.2;
      if (!sameWall) continue;
      const [ws, we] = w.axis === 'h' ? [w.x, w.x + w.lenFt] : [w.y, w.y + w.lenFt];
      const [ds, de] = d.axis === 'h' ? [d.x, d.x + d.lenFt] : [d.y, d.y + d.lenFt];
      assert.ok(we <= ds || ds + (de - ds) <= ws, `window ${ws}-${we} overlaps door ${ds}-${de}`);
    }
  }
});

test('a bathroom gets a narrow door and a narrow window', () => {
  const bath = floor([
    room('l', 'living', 0, 0, 14, 14),
    room('b', 'bathroom', 14, 0, 6, 14),
  ]);
  const { doors, windows } = computeOpenings(bath);
  const toBath = doors.find((d) => d.kind === 'door');
  assert.ok(toBath && toBath.lenFt <= 2.3, `bathroom door was ${toBath?.lenFt} ft`);
  assert.ok(windows.every((w) => w.lenFt <= 6));
});

test('a terrace gets no windows, being open already', () => {
  const withTerrace = floor([
    room('l', 'living', 0, 0, 14, 14),
    room('t', 'terrace', 14, 0, 10, 14),
  ]);
  const { windows } = computeOpenings(withTerrace);
  assert.ok(windows.every((w) => w.x < 14.1), 'terrace should carry no glazing');
});

test('columns sit on wall junctions and collapse duplicates', () => {
  const { columns } = computeOpenings(QUAD);
  // Four outer corners, four mid-edge junctions, one centre. Never one per
  // room corner, which would be sixteen.
  assert.ok(columns.length >= 8 && columns.length <= 10, `got ${columns.length} columns`);
  assert.ok(columns.some((c) => Math.abs(c.x - 12) < 0.1 && Math.abs(c.y - 12) < 0.1));
  for (const c of columns) {
    assert.ok(c.x >= 0 && c.x <= 24 && c.y >= 0 && c.y <= 24);
    assert.equal(c.sizeFt, 0.75);
  }
});

test('no two columns end up on top of each other', () => {
  const { columns } = computeOpenings(QUAD);
  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const a = columns[i];
      const b = columns[j];
      assert.ok(
        Math.abs(a.x - b.x) >= 2.5 || Math.abs(a.y - b.y) >= 2.5,
        `columns ${i} and ${j} overlap`,
      );
    }
  }
});

test('a real computed plan comes out with every room reachable', () => {
  const plan = planHouse(
    { area: { value: 4, unit: 'aana' }, roadSide: 'east' },
    {
      floors: 2,
      bedrooms: 3,
      attachedBathrooms: 1,
      parkingCars: 1,
      kitchen: true,
      living: true,
      dining: true,
      puja: true,
      store: false,
      stylePackId: 'modern-minimal',
    },
  );

  for (const f of plan.floors) {
    const { doors, columns } = computeOpenings(f);
    assert.ok(columns.length > 0, `${f.nameEn} has no columns`);

    const reachable = new Set<string>();
    for (const door of doors) {
      for (const r of f.rooms) {
        const onV =
          door.axis === 'v' &&
          (Math.abs(door.x - r.x) < 0.2 || Math.abs(door.x - (r.x + r.w)) < 0.2);
        const onH =
          door.axis === 'h' &&
          (Math.abs(door.y - r.y) < 0.2 || Math.abs(door.y - (r.y + r.h)) < 0.2);
        const alongV = door.axis === 'v' && door.y >= r.y - 0.2 && door.y + door.lenFt <= r.y + r.h + 0.2;
        const alongH = door.axis === 'h' && door.x >= r.x - 0.2 && door.x + door.lenFt <= r.x + r.w + 0.2;
        if ((onV && alongV) || (onH && alongH)) reachable.add(r.id);
      }
    }

    for (const r of f.rooms) {
      if (r.kind === 'terrace') continue;
      assert.ok(reachable.has(r.id), `${f.nameEn}: ${r.nameEn} has no door`);
    }
  }
});

test('the same floor always produces the same openings', () => {
  const a = JSON.stringify(computeOpenings(QUAD));
  const b = JSON.stringify(computeOpenings(QUAD));
  assert.equal(a, b);
});
