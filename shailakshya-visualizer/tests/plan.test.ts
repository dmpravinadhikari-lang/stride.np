/**
 * Tests for the layout engine.
 *
 * A plan that looks plausible but has two rooms in the same place, or rooms
 * spilling past the setback line, is worse than no plan — the customer would
 * take it to a meeting. So the invariants are asserted rather than eyeballed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { planHouse, squarify, resolvePlot, buildProgramme } from '../worker/plan/layout.ts';
import { toSqFt, describeAreaNepali } from '../worker/plan/units.ts';
import type { LandInput, PlannedFloor, RequirementInput } from '../worker/plan/types.ts';

const land = (over: Partial<LandInput> = {}): LandInput => ({
  area: { value: 4, unit: 'aana' },
  roadSide: 'south',
  ...over,
});

const req = (over: Partial<RequirementInput> = {}): RequirementInput => ({
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
  ...over,
});

function overlaps(a: { x: number; y: number; w: number; h: number }, b: typeof a): boolean {
  const gap = 0.001; // edges are snapped to an exact shared grid
  return (
    a.x < b.x + b.w - gap &&
    b.x < a.x + a.w - gap &&
    a.y < b.y + b.h - gap &&
    b.y < a.y + a.h - gap
  );
}

function assertFloorSane(floor: PlannedFloor, maxW: number, maxD: number) {
  for (const room of floor.rooms) {
    assert.ok(room.w > 0 && room.h > 0, `${room.nameEn} has no size`);
    assert.ok(
      room.x >= -0.05 && room.y >= -0.05,
      `${room.nameEn} starts outside the footprint`,
    );
    assert.ok(
      room.x + room.w <= maxW + 0.15 && room.y + room.h <= maxD + 0.15,
      `${room.nameEn} spills past the buildable area`,
    );
  }

  for (let i = 0; i < floor.rooms.length; i++) {
    for (let j = i + 1; j < floor.rooms.length; j++) {
      const a = floor.rooms[i]!;
      const b = floor.rooms[j]!;
      assert.ok(!overlaps(a, b), `${a.nameEn} overlaps ${b.nameEn} on ${floor.nameEn}`);
    }
  }
}

test('land units convert exactly', () => {
  assert.equal(toSqFt(1, 'ropani'), 5476);
  assert.equal(toSqFt(16, 'aana'), 5476);
  assert.equal(toSqFt(1, 'aana'), 342.25);
  assert.equal(toSqFt(20, 'kattha'), 72900);
  assert.equal(toSqFt(1, 'sqft'), 1);
});

test('area is described the way a plot is spoken about', () => {
  assert.equal(describeAreaNepali(5476), '1 ropani');
  assert.match(describeAreaNepali(toSqFt(4, 'aana')), /4 aana/);
});

test('squarify fills the rectangle without overlaps', () => {
  const items = [40, 30, 25, 20, 15, 10, 8, 5].map((area, i) => ({
    key: { kind: 'bedroom' as const, index: i },
    area,
  }));
  const total = items.reduce((s, i) => s + i.area, 0);
  // A rect whose area equals the item total, so the fill should be exact.
  const rect = { x: 0, y: 0, w: Math.sqrt(total * 1.4), h: total / Math.sqrt(total * 1.4) };

  const placed = squarify(items, rect);

  assert.equal(placed.length, items.length, 'every item is placed');

  const covered = placed.reduce((s, p) => s + p.w * p.h, 0);
  assert.ok(
    Math.abs(covered - rect.w * rect.h) < 0.01,
    `covered ${covered} should equal rect area ${rect.w * rect.h}`,
  );

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      assert.ok(!overlaps(placed[i]!, placed[j]!), 'placed rectangles must not overlap');
    }
  }
});

test('a typical brief produces a sane plan', () => {
  const plan = planHouse(land(), req());

  assert.equal(plan.floors.length, 2, 'two storeys requested');
  assert.equal(plan.totals.bedrooms, 3, 'three bedrooms requested');
  assert.ok(plan.totals.builtUpSqFt > 0);
  assert.ok(plan.totals.groundCoveragePct > 0 && plan.totals.groundCoveragePct <= 100);

  for (const floor of plan.floors) {
    assertFloorSane(floor, plan.buildable.widthFt, plan.buildable.depthFt);
  }
});

test('the house never covers more ground than the setbacks allow', () => {
  const plan = planHouse(land({ area: { value: 10, unit: 'aana' } }), req());
  const ground = plan.floors[0]!;
  assert.ok(
    ground.areaSqFt <= plan.buildable.areaSqFt + 1,
    `ground floor ${ground.areaSqFt} exceeds buildable ${plan.buildable.areaSqFt}`,
  );
});

test('a generous plot does not inflate the rooms absurdly', () => {
  const plan = planHouse(land({ area: { value: 1, unit: 'ropani' } }), req({ bedrooms: 2 }));
  const bathroom = plan.floors.flatMap((f) => f.rooms).find((r) => r.kind === 'bathroom');
  assert.ok(bathroom, 'there is a bathroom');
  assert.ok(
    bathroom.areaSqFt < 110,
    `a bathroom on a big plot should stay a bathroom, got ${bathroom.areaSqFt} sq ft`,
  );
});

test('an over-ambitious brief is reported rather than quietly squeezed', () => {
  const plan = planHouse(
    land({ area: { value: 1, unit: 'aana' } }),
    req({ bedrooms: 6, floors: 1, parkingCars: 2 }),
  );

  assert.equal(plan.fits, false, 'six bedrooms on one aana should not be reported as fitting');
  assert.ok(plan.warnings.length > 0, 'the customer is told why');
});

test('a plot swallowed by its setbacks fails cleanly', () => {
  const plan = planHouse(
    { widthFt: 12, depthFt: 12, roadSide: 'east' },
    req(),
  );

  assert.equal(plan.fits, false);
  assert.equal(plan.floors.length, 0);
  assert.match(plan.warnings[0] ?? '', /setback/i);
});

test('a stair appears on every floor that has one above it', () => {
  const programme = buildProgramme(req({ floors: 3 }));
  assert.equal(programme.length, 3);
  assert.ok(programme[0]!.some((i) => i.kind === 'stair'), 'ground reaches the first floor');
  assert.ok(programme[1]!.some((i) => i.kind === 'stair'), 'first reaches the second');
  assert.ok(!programme[2]!.some((i) => i.kind === 'stair'), 'the top floor needs no stair up');
});

test('a single storey house keeps everything on one level', () => {
  const programme = buildProgramme(req({ floors: 1, bedrooms: 2 }));
  assert.equal(programme.length, 1);
  assert.ok(!programme[0]!.some((i) => i.kind === 'stair'), 'no stair in a bungalow');
  assert.equal(
    programme[0]!.filter((i) => i.kind === 'bedroom' || i.kind === 'master').length,
    2,
  );
});

test('plot dimensions are derived when only the area is known', () => {
  const p = resolvePlot({ area: { value: 4, unit: 'aana' }, roadSide: 'north' });
  assert.ok(Math.abs(p.areaSqFt - 1369) < 1);
  assert.ok(p.depthFt > p.widthFt, 'assumes a deeper-than-wide plot');
  assert.ok(Math.abs(p.widthFt * p.depthFt - p.areaSqFt) < 0.5);
});
