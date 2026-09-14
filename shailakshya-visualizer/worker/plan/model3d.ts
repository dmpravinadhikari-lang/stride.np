/**
 * The house as a 3D model, in glTF binary (.glb).
 *
 * This is an export, not a generation. The layout engine already knows every
 * room's position and size to a tenth of a foot, and openings.ts knows where
 * every door, window and column goes — so the solid is a straight extrusion of
 * geometry we hold exactly. No model runs, nothing is guessed, it costs
 * nothing, and the same brief always produces byte-identical output.
 *
 * That is the whole reason the plan was computed rather than drawn by a
 * diffusion model. A picture of a house cannot be extruded; a plan can.
 *
 * The result opens in anything that reads glTF 2.0 — Blender, SketchUp with an
 * importer, three.js, Windows 3D Viewer, macOS Quick Look — so the customer or
 * their engineer can walk through it before a single brick is bought.
 *
 * What it is not: a BIM model. There is no structure, no services, no roof
 * framing, no material takeoff. Walls are boxes, openings are holes, columns
 * are prisms. It is the massing and the circulation, which is what somebody
 * deciding on a house needs to see.
 */
import type { HousePlan, PlannedFloor } from './types.ts';
import { computeOpenings, type Opening } from './openings.ts';

/** Floor to floor, in feet. Ordinary for a Kathmandu valley house. */
const STOREY_FT = 9.5;
const SLAB_FT = 0.5;
const WALL_FT = 9;

const EXTERIOR_THICK_FT = 0.75;
const INTERIOR_THICK_FT = 0.4;

/** Head heights. A window sits between sill and head; a door starts at zero. */
const DOOR_HEAD_FT = 7;
const SHUTTER_HEAD_FT = 7.5;
const WINDOW_SILL_FT = 3;
const WINDOW_HEAD_FT = 7;

/** A terrace is enclosed by a parapet, not a wall. */
const PARAPET_FT = 3.5;

const EPS = 0.15;

interface Box {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

/** One wall run: a line, a stretch of it, how thick and how tall. */
interface WallRun {
  axis: 'h' | 'v';
  /** y for 'h', x for 'v'. */
  at: number;
  start: number;
  end: number;
  thick: number;
  height: number;
}

type MaterialName = 'wall' | 'slab' | 'column';

const MATERIALS: Record<MaterialName, [number, number, number]> = {
  // Warm plaster, valley grey concrete, and a darker column so the frame reads.
  wall: [0.93, 0.9, 0.85],
  slab: [0.76, 0.74, 0.7],
  column: [0.42, 0.43, 0.45],
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Every wall on a floor, as non-overlapping runs.
 *
 * Room edges are collected, grouped onto their shared line, then split at every
 * breakpoint so two rooms meeting along part of a wall produce one run rather
 * than two boxes fighting over the same faces. Each elementary stretch takes
 * the tallest and thickest claim on it, which is what makes a terrace parapet
 * stop where the room beside it starts.
 */
function wallRuns(floor: PlannedFloor, footW: number, footD: number): WallRun[] {
  interface Claim { start: number; end: number; thick: number; height: number }
  const groups = new Map<string, Claim[]>();

  const claim = (axis: 'h' | 'v', at: number, start: number, end: number, parapet: boolean) => {
    if (end - start < 0.2) return;
    const onBoundary =
      axis === 'h'
        ? Math.abs(at) < EPS || Math.abs(at - footD) < EPS
        : Math.abs(at) < EPS || Math.abs(at - footW) < EPS;

    const key = `${axis}:${at.toFixed(1)}`;
    const list = groups.get(key) ?? [];
    list.push({
      start,
      end,
      thick: onBoundary ? EXTERIOR_THICK_FT : INTERIOR_THICK_FT,
      height: parapet ? PARAPET_FT : WALL_FT,
    });
    groups.set(key, list);
  };

  for (const room of floor.rooms) {
    // A terrace is open to the sky: its edges are parapets unless the room on
    // the other side raises them to a full wall, which the max below handles.
    const parapet = room.kind === 'terrace';
    claim('h', room.y, room.x, room.x + room.w, parapet);
    claim('h', room.y + room.h, room.x, room.x + room.w, parapet);
    claim('v', room.x, room.y, room.y + room.h, parapet);
    claim('v', room.x + room.w, room.y, room.y + room.h, parapet);
  }

  const runs: WallRun[] = [];

  for (const [key, claims] of groups) {
    const [axisPart, atPart] = key.split(':');
    const axis = axisPart as 'h' | 'v';
    const at = Number(atPart);

    const cuts = [...new Set(claims.flatMap((c) => [c.start, c.end]))].sort((a, b) => a - b);

    for (let i = 0; i < cuts.length - 1; i++) {
      const start = cuts[i] as number;
      const end = cuts[i + 1] as number;
      const covering = claims.filter((c) => c.start <= start + EPS && c.end >= end - EPS);
      if (covering.length === 0) continue;

      runs.push({
        axis,
        at,
        start,
        end,
        thick: Math.max(...covering.map((c) => c.thick)),
        height: Math.max(...covering.map((c) => c.height)),
      });
    }
  }

  return runs;
}

/** The openings that sit in this run, in order along it. */
function openingsOn(run: WallRun, openings: Opening[]): Array<{ from: number; to: number; opening: Opening }> {
  return openings
    .filter((o) => {
      if (o.axis !== run.axis) return false;
      const at = o.axis === 'h' ? o.y : o.x;
      if (Math.abs(at - run.at) > EPS) return false;
      const from = o.axis === 'h' ? o.x : o.y;
      return from >= run.start - EPS && from + o.lenFt <= run.end + EPS;
    })
    .map((opening) => {
      const from = opening.axis === 'h' ? opening.x : opening.y;
      return { from, to: from + opening.lenFt, opening };
    })
    .sort((a, b) => a.from - b.from);
}

/** A wall run cut into solid boxes, with real holes where the openings are. */
function wallBoxes(run: WallRun, base: number, openings: Opening[]): Box[] {
  const boxes: Box[] = [];
  const half = run.thick / 2;

  const solid = (start: number, end: number, z0: number, z1: number) => {
    if (end - start < 0.05 || z1 - z0 < 0.05) return;
    boxes.push(
      run.axis === 'h'
        ? { x0: start, y0: run.at - half, z0: base + z0, x1: end, y1: run.at + half, z1: base + z1 }
        : { x0: run.at - half, y0: start, z0: base + z0, x1: run.at + half, y1: end, z1: base + z1 },
    );
  };

  const holes = openingsOn(run, openings);
  let cursor = run.start;

  for (const { from, to, opening } of holes) {
    solid(cursor, from, 0, run.height);

    if (opening.kind === 'window') {
      // Sill below, lintel above; the glass itself is left out so the model
      // reads as an opening rather than a sealed box.
      solid(from, to, 0, Math.min(WINDOW_SILL_FT, run.height));
      solid(from, to, Math.min(WINDOW_HEAD_FT, run.height), run.height);
    } else {
      const head = opening.kind === 'shutter' ? SHUTTER_HEAD_FT : DOOR_HEAD_FT;
      solid(from, to, Math.min(head, run.height), run.height);
    }

    cursor = to;
  }

  solid(cursor, run.end, 0, run.height);
  return boxes;
}

// ---------------------------------------------------------------------------
// glTF binary
// ---------------------------------------------------------------------------

/** Six quads with flat normals. Boxes are all this model is made of. */
function pushBox(positions: number[], normals: number[], indices: number[], box: Box): void {
  const { x0, y0, z0, x1, y1, z1 } = box;

  // glTF is Y-up and right-handed; the plan is X across and Y down the page.
  // Plan x becomes X, plan y becomes Z, and height becomes Y.
  const corner = (px: number, pz: number, py: number) => [px, py, pz];

  const faces: Array<{ n: [number, number, number]; v: number[][] }> = [
    { n: [0, -1, 0], v: [corner(x0, y0, z0), corner(x1, y0, z0), corner(x1, y1, z0), corner(x0, y1, z0)] },
    { n: [0, 1, 0], v: [corner(x0, y1, z1), corner(x1, y1, z1), corner(x1, y0, z1), corner(x0, y0, z1)] },
    { n: [0, 0, -1], v: [corner(x0, y0, z1), corner(x1, y0, z1), corner(x1, y0, z0), corner(x0, y0, z0)] },
    { n: [0, 0, 1], v: [corner(x0, y1, z0), corner(x1, y1, z0), corner(x1, y1, z1), corner(x0, y1, z1)] },
    { n: [-1, 0, 0], v: [corner(x0, y1, z1), corner(x0, y0, z1), corner(x0, y0, z0), corner(x0, y1, z0)] },
    { n: [1, 0, 0], v: [corner(x1, y0, z1), corner(x1, y1, z1), corner(x1, y1, z0), corner(x1, y0, z0)] },
  ];

  for (const face of faces) {
    const base = positions.length / 3;
    for (const vertex of face.v) {
      positions.push(vertex[0] as number, vertex[1] as number, vertex[2] as number);
      normals.push(face.n[0], face.n[1], face.n[2]);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

function align4(length: number): number {
  return (4 - (length % 4)) % 4;
}

interface Part {
  material: MaterialName;
  positions: number[];
  normals: number[];
  indices: number[];
}

function encodeGlb(parts: Part[]): Uint8Array {
  const materialNames = Object.keys(MATERIALS) as MaterialName[];

  const bufferViews: unknown[] = [];
  const accessors: unknown[] = [];
  const meshes: unknown[] = [];
  const chunks: ArrayBuffer[] = [];
  let offset = 0;

  const addView = (data: ArrayBuffer, target: number) => {
    const pad = align4(data.byteLength);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.byteLength, target });
    chunks.push(data);
    if (pad) chunks.push(new ArrayBuffer(pad));
    offset += data.byteLength + pad;
    return bufferViews.length - 1;
  };

  for (const part of parts) {
    if (part.indices.length === 0) continue;

    const positions = new Float32Array(part.positions);
    const normals = new Float32Array(part.normals);
    const indices = new Uint32Array(part.indices);

    // Accessors carry min/max for POSITION; viewers use it to frame the model.
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        const value = positions[i + a] as number;
        if (value < (min[a] as number)) min[a] = value;
        if (value > (max[a] as number)) max[a] = value;
      }
    }

    const posView = addView(positions.buffer as ArrayBuffer, 34962);
    const normView = addView(normals.buffer as ArrayBuffer, 34962);
    const idxView = addView(indices.buffer as ArrayBuffer, 34963);

    accessors.push(
      { bufferView: posView, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max },
      { bufferView: normView, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
      { bufferView: idxView, componentType: 5125, count: indices.length, type: 'SCALAR' },
    );

    const base = accessors.length - 3;
    meshes.push({
      name: part.material,
      primitives: [
        {
          attributes: { POSITION: base, NORMAL: base + 1 },
          indices: base + 2,
          material: materialNames.indexOf(part.material),
        },
      ],
    });
  }

  const json = {
    asset: { version: '2.0', generator: 'Shailakshya visualizer — indicative massing only' },
    scene: 0,
    scenes: [{ nodes: meshes.map((_, i) => i) }],
    nodes: meshes.map((_, i) => ({ mesh: i })),
    meshes,
    materials: materialNames.map((name) => ({
      name,
      pbrMetallicRoughness: {
        baseColorFactor: [...MATERIALS[name], 1],
        metallicFactor: 0,
        roughnessFactor: 0.9,
      },
      doubleSided: true,
    })),
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = align4(jsonBytes.byteLength);
  const jsonLength = jsonBytes.byteLength + jsonPad;

  const binLength = offset;
  const total = 12 + 8 + jsonLength + 8 + binLength;

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let cursor = 0;

  view.setUint32(cursor, 0x46546c67, true); // "glTF"
  view.setUint32(cursor + 4, 2, true);
  view.setUint32(cursor + 8, total, true);
  cursor += 12;

  view.setUint32(cursor, jsonLength, true);
  view.setUint32(cursor + 4, 0x4e4f534a, true); // "JSON"
  cursor += 8;
  out.set(jsonBytes, cursor);
  // The JSON chunk pads with spaces, the binary chunk with zeroes.
  for (let i = 0; i < jsonPad; i++) out[cursor + jsonBytes.byteLength + i] = 0x20;
  cursor += jsonLength;

  view.setUint32(cursor, binLength, true);
  view.setUint32(cursor + 4, 0x004e4942, true); // "BIN\0"
  cursor += 8;
  for (const chunk of chunks) {
    out.set(new Uint8Array(chunk), cursor);
    cursor += chunk.byteLength;
  }

  return out;
}

// ---------------------------------------------------------------------------

/** Whether a point lies on or inside a room's rectangle. */
function touches(room: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean {
  return (
    x >= room.x - EPS && x <= room.x + room.w + EPS && y >= room.y - EPS && y <= room.y + room.h + EPS
  );
}

/** The whole house, every storey stacked, as a .glb byte array. */
export function buildHouseModel(plan: HousePlan): Uint8Array {
  const parts: Record<MaterialName, Part> = {
    wall: { material: 'wall', positions: [], normals: [], indices: [] },
    slab: { material: 'slab', positions: [], normals: [], indices: [] },
    column: { material: 'column', positions: [], normals: [], indices: [] },
  };

  plan.floors.forEach((floor, level) => {
    if (floor.rooms.length === 0) return;

    const footW = Math.max(...floor.rooms.map((r) => r.x + r.w));
    const footD = Math.max(...floor.rooms.map((r) => r.y + r.h));
    const base = level * STOREY_FT;

    // The slab this storey stands on.
    pushBox(parts.slab.positions, parts.slab.normals, parts.slab.indices, {
      x0: 0,
      y0: 0,
      z0: base - SLAB_FT,
      x1: footW,
      y1: footD,
      z1: base,
    });

    const { doors, windows, columns } = computeOpenings(floor);
    const openings = [...doors, ...windows];

    for (const run of wallRuns(floor, footW, footD)) {
      for (const box of wallBoxes(run, base, openings)) {
        pushBox(parts.wall.positions, parts.wall.normals, parts.wall.indices, box);
      }
    }

    const topFloor = level === plan.floors.length - 1;

    for (const column of columns) {
      // A hair proud of the wall it sits in. Exactly coincident faces z-fight,
      // and the striping that produces reads as a rendering fault rather than
      // as a column.
      const half = column.sizeFt / 2 + 0.02;

      // On the top storey a column beside nothing but terrace carries no slab,
      // so it stops at the parapet instead of standing up alone in the sky.
      const onlyTerrace =
        topFloor &&
        floor.rooms
          .filter((r) => touches(r, column.x, column.y))
          .every((r) => r.kind === 'terrace');

      pushBox(parts.column.positions, parts.column.normals, parts.column.indices, {
        x0: column.x - half,
        y0: column.y - half,
        z0: base,
        x1: column.x + half,
        y1: column.y + half,
        z1: base + (onlyTerrace ? PARAPET_FT : STOREY_FT),
      });
    }
  });

  // The roof slab over the top storey.
  const top = plan.floors[plan.floors.length - 1];
  if (top && top.rooms.length) {
    const footW = Math.max(...top.rooms.map((r) => r.x + r.w));
    const footD = Math.max(...top.rooms.map((r) => r.y + r.h));
    const roofed = top.rooms.filter((r) => r.kind !== 'terrace');
    for (const room of roofed) {
      pushBox(parts.slab.positions, parts.slab.normals, parts.slab.indices, {
        x0: room.x,
        y0: room.y,
        z0: plan.floors.length * STOREY_FT - SLAB_FT,
        x1: Math.min(room.x + room.w, footW),
        y1: Math.min(room.y + room.h, footD),
        z1: plan.floors.length * STOREY_FT,
      });
    }
  }

  return encodeGlb([parts.slab, parts.wall, parts.column]);
}
