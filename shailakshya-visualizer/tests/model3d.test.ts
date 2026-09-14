/**
 * The .glb export.
 *
 * A malformed model is worse than no model: it downloads, it looks like a
 * deliverable, and it fails in the customer's viewer with an error they cannot
 * act on. So these check the container is valid glTF 2.0 before they check
 * anything about the house.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHouseModel } from '../worker/plan/model3d.ts';
import { planHouse } from '../worker/plan/layout.ts';
import type { HousePlan } from '../worker/plan/types.ts';

function house(floors = 2): HousePlan {
  return planHouse(
    { area: { value: 4, unit: 'aana' }, roadSide: 'east' },
    {
      floors,
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
}

/** Reads the JSON chunk back out of the container. */
function parseGlb(bytes: Uint8Array): { json: Record<string, any>; binLength: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  assert.equal(view.getUint32(0, true), 0x46546c67, 'magic should be "glTF"');
  assert.equal(view.getUint32(4, true), 2, 'glTF version 2');
  assert.equal(view.getUint32(8, true), bytes.byteLength, 'declared length matches the buffer');

  const jsonLength = view.getUint32(12, true);
  assert.equal(view.getUint32(16, true), 0x4e4f534a, 'first chunk is JSON');
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));

  const binStart = 20 + jsonLength;
  const binLength = view.getUint32(binStart, true);
  assert.equal(view.getUint32(binStart + 4, true), 0x004e4942, 'second chunk is BIN');

  return { json, binLength };
}

test('the export is a valid glTF 2.0 binary container', () => {
  const { json, binLength } = parseGlb(buildHouseModel(house()));
  assert.equal(json.asset.version, '2.0');
  assert.equal(json.buffers.length, 1);
  assert.equal(json.buffers[0].byteLength, binLength, 'buffer length matches the BIN chunk');
});

test('every chunk and buffer view is four-byte aligned', () => {
  const bytes = buildHouseModel(house());
  const { json } = parseGlb(bytes);
  assert.equal(bytes.byteLength % 4, 0, 'total length');
  for (const view of json.bufferViews) {
    assert.equal(view.byteOffset % 4, 0, `bufferView at ${view.byteOffset}`);
  }
});

test('every buffer view stays inside the binary chunk', () => {
  const { json, binLength } = parseGlb(buildHouseModel(house()));
  for (const view of json.bufferViews) {
    assert.ok(
      view.byteOffset + view.byteLength <= binLength,
      `bufferView overruns the buffer by ${view.byteOffset + view.byteLength - binLength} bytes`,
    );
  }
});

test('accessors point at real buffer views and count real elements', () => {
  const { json } = parseGlb(buildHouseModel(house()));
  assert.ok(json.accessors.length > 0);
  for (const accessor of json.accessors) {
    assert.ok(json.bufferViews[accessor.bufferView], 'bufferView exists');
    assert.ok(accessor.count > 0, 'accessor is not empty');
    const stride = accessor.type === 'VEC3' ? 3 : 1;
    const size = accessor.componentType === 5126 || accessor.componentType === 5125 ? 4 : 2;
    assert.equal(
      json.bufferViews[accessor.bufferView].byteLength,
      accessor.count * stride * size,
      'declared count matches the bytes behind it',
    );
  }
});

test('every mesh names a material that exists', () => {
  const { json } = parseGlb(buildHouseModel(house()));
  assert.ok(json.meshes.length > 0);
  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives) {
      assert.ok(json.materials[primitive.material], `${mesh.name} has no material`);
    }
  }
});

test('the model is the size of the house, in feet', () => {
  const plan = house(2);
  const { json } = parseGlb(buildHouseModel(plan));
  const position = json.accessors.find((a: any) => a.min && a.max);
  assert.ok(position, 'expected a POSITION accessor carrying bounds');

  const [minX, minY, minZ] = position.min;
  const [maxX, maxY, maxZ] = position.max;

  // Y is up in glTF: two storeys at 9.5 ft plus the roof slab.
  assert.ok(maxY - minY > 15 && maxY - minY < 22, `height came out ${maxY - minY} ft`);
  // The footprint should not exceed the buildable area it was laid out in.
  assert.ok(maxX - minX <= plan.buildable.widthFt + 1, `width ${maxX - minX} ft`);
  assert.ok(maxZ - minZ <= plan.buildable.depthFt + 1, `depth ${maxZ - minZ} ft`);
});

test('a bungalow exports one storey, not two', () => {
  const one = parseGlb(buildHouseModel(house(1)));
  const two = parseGlb(buildHouseModel(house(2)));
  const heightOf = (g: any) => {
    const a = g.json.accessors.find((x: any) => x.min);
    return a.max[1] - a.min[1];
  };
  assert.ok(heightOf(one) < heightOf(two), 'a single storey should be shorter');
});

test('the same brief always exports byte-identical geometry', () => {
  const a = buildHouseModel(house());
  const b = buildHouseModel(house());
  assert.equal(Buffer.from(a).toString('base64'), Buffer.from(b).toString('base64'));
});

test('walls are cut, not solid: the openings really are holes', () => {
  // A wall with a door in it needs more boxes than one without, because the
  // run is split either side of the leaf plus a lintel over it. If openings
  // were ignored the triangle count would not move.
  const plan = house(2);
  const withOpenings = buildHouseModel(plan);
  const { json } = parseGlb(withOpenings);
  const wallMesh = json.meshes.find((m: any) => m.name === 'wall');
  assert.ok(wallMesh, 'expected a wall mesh');

  const indices = json.accessors[wallMesh.primitives[0].indices];
  // Six faces per box, two triangles each, three indices per triangle = 36.
  const boxes = indices.count / 36;
  assert.ok(Number.isInteger(boxes), 'wall geometry should be whole boxes');
  assert.ok(boxes > plan.floors.length * 8, `only ${boxes} wall boxes — openings look uncut`);
});
