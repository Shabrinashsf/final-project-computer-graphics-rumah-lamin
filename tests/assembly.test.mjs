// Integration tests: the generated GLBs in public/components must satisfy docs/contract.md,
// assemble without errors, and be walkable. Run `npm run gen` first if GLBs are stale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Box3, Vector3 } from 'three';
import { readGLB } from '../tools/lib/glb-reader.mjs';
import { solveAssembly } from '../src/assembly/solve.js';
import { checkAssembly } from '../src/assembly/check.js';
import { createPlayerState, stepPlayer } from '../src/walk/collision.js';

const manifest = JSON.parse(fs.readFileSync(new URL('../src/assembly/manifest.json', import.meta.url)));
const parts = {};
for (const [name, c] of Object.entries(manifest.components)) {
  parts[name] = readGLB(new URL(`../public/${c.src}`, import.meta.url));
}
const anchorsBy = Object.fromEntries(Object.entries(parts).map(([k, p]) => [k, p.anchors]));
const solved = solveAssembly(manifest, anchorsBy);
const byId = Object.fromEntries(solved.instances.map((i) => [i.id, i]));

const EPS = 1e-4;
const pos = (m) => new Vector3().setFromMatrixPosition(m);
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < EPS, `${msg}: ${a} != ${b}`);

// World bounds of an instance's visible meshes (optionally filtered by mesh-name prefix).
function bounds(id, prefix = '') {
  const inst = byId[id];
  const out = new Box3();
  for (const m of parts[inst.component].meshes) {
    if (m.name.startsWith('col_') || !m.name.startsWith(prefix)) continue;
    out.union(new Box3(new Vector3(...m.min), new Vector3(...m.max)).applyMatrix4(inst.matrix.clone().multiply(m.matrix)));
  }
  return out;
}

// ---- Contract section 4: anchors per component (local coordinates) ----
const REQUIRED = {
  tanah: { anchor_house: [0, 0, 0] },
  lantai: {
    anchor_base: [0, -1.8, 0], anchor_dinding: [0, 0, 0], anchor_pagar: [0, 0, 7], anchor_interior: [0, 0, 0],
    anchor_tangga_kiri: [-13.75, 0, 7], anchor_tangga_kanan: [13.75, 0, 7],
  },
  tiang: { anchor_ground: [0, 0, 0], anchor_top: [0, 1.6, 0] },
  dinding: { anchor_base: [0, 0, 0], anchor_atap: [0, 4.5, 0], anchor_atap_atang_0: [0, 4.5, -12.5] },
  pagar: { anchor_base: [0, 0, 0], anchor_atap_usei: [0, 2.3, 0] },
  tangga: {
    anchor_top: [0, 0, 0], anchor_ground: [0, -1.8, 3.17],
    anchor_patung_kiri: [-1.8, -1.8, 2.57], anchor_patung_kanan: [1.8, -1.8, 2.57],
  },
  atap: { anchor_base: [0, 0, 0] },
  atap_atang: { anchor_base: [0, 0, 0] },
  atap_usei: { anchor_base: [0, 0, 0] },
};

for (const [comp, anchors] of Object.entries(REQUIRED)) {
  test(`contract: ${comp} has required anchors at contract positions`, () => {
    for (const [name, xyz] of Object.entries(anchors)) {
      const m = parts[comp].anchors[name];
      assert.ok(m, `${comp} missing ${name}`);
      const p = pos(m);
      near(p.x, xyz[0], `${comp}.${name}.x`);
      near(p.y, xyz[1], `${comp}.${name}.y`);
      near(p.z, xyz[2], `${comp}.${name}.z`);
    }
  });
}

test('contract: lantai has 84 pillar anchors (13 x 6 main grid + 3 x 2 atang) at y = -0.2', () => {
  const pillars = Object.entries(parts.lantai.anchors).filter(([n]) => n.startsWith('anchor_tiang_')).map(([, m]) => pos(m));
  assert.equal(pillars.length, 84);
  for (const p of pillars) near(p.y, -0.2, 'pillar anchor y');
  const main = pillars.filter((p) => p.z >= -10 - EPS);
  assert.equal(main.length, 78);
  assert.equal(new Set(main.map((p) => p.x.toFixed(2))).size, 13);
  assert.deepEqual([...new Set(main.map((p) => p.z.toFixed(2)))].map(Number).sort((a, b) => a - b), [-10, -5, 0, 2.5, 5, 6.8]);
  const atang = pillars.filter((p) => p.z < -10 - EPS);
  assert.deepEqual([...new Set(atang.map((p) => p.x.toFixed(2)))].map(Number).sort((a, b) => a - b), [-2.5, 0, 2.5]);
  assert.deepEqual([...new Set(atang.map((p) => p.z.toFixed(2)))].map(Number).sort((a, b) => a - b), [-15, -12.5]);
});

test('contract: walkable components have col_ colliders', () => {
  for (const comp of ['tanah', 'lantai', 'tiang', 'dinding', 'pagar', 'tangga']) {
    assert.ok(parts[comp].meshes.some((m) => m.name.startsWith('col_')), `${comp} has no col_ mesh`);
  }
});

// ---- Assembly ----
test('assembly: solves 93 instances (9 + 84 pillars) without errors', () => {
  assert.deepEqual(solved.errors, []);
  assert.equal(solved.instances.length, 93);
  assert.equal(solved.instances.filter((i) => i.component === 'tiang').length, 84);
});

test('assembly: check passes (ground contact + no overlaps > 1 cm)', () => {
  const r = checkAssembly({ instances: solved.instances, parts, manifest });
  assert.deepEqual(r.groundErrors, []);
  assert.deepEqual(r.overlaps, []);
  assert.ok(r.ok);
});

// ---- Contract section 5: key world dimensions ----
test('world: deck slab y 1.6..1.8, x ±15.2, z -15.2..7.0', () => {
  const b = bounds('lantai');
  near(b.min.y, 1.6, 'deck bottom'); near(b.max.y, 1.8, 'deck top');
  near(b.min.x, -15.2, 'deck -x'); near(b.max.x, 15.2, 'deck +x');
  near(b.min.z, -15.2, 'deck back (atang)'); near(b.max.z, 7.0, 'deck front');
});

test('world: every pillar spans ground (0) to deck bottom (1.6)', () => {
  for (const inst of solved.instances.filter((i) => i.component === 'tiang')) {
    const b = bounds(inst.id);
    near(b.min.y, 0, `${inst.id} bottom`);
    near(b.max.y, 1.6, `${inst.id} top`);
  }
});

test('world: walls sit on the deck, top at 6.3, inside x ±15.06 / z -15.06..0.1', () => {
  const b = bounds('dinding', 'dinding_');
  near(b.min.y, 1.8, 'wall base'); near(b.max.y, 6.3, 'wall top');
  assert.ok(b.min.x >= -15.06 - EPS && b.max.x <= 15.06 + EPS, `wall x ${b.min.x}..${b.max.x}`);
  assert.ok(b.min.z >= -15.06 - EPS && b.max.z <= 0.1 + EPS, `wall z ${b.min.z}..${b.max.z}`);
});

test('world: veranda railing posts end at the veranda roof base (y 4.1) and stay on the deck', () => {
  const b = bounds('pagar');
  near(b.min.y, 1.8, 'pagar base');
  near(b.max.y, 4.1, 'post top');
  assert.ok(b.max.z <= 7.0 + EPS, `pagar front ${b.max.z}`);
});

test('world: each stair runs from deck top (1.8) at z 7 down to the ground', () => {
  for (const id of ['tangga_kiri', 'tangga_kanan']) {
    const treads = bounds(id, 'tangga_treads');
    assert.ok(treads.max.y <= 1.8 + EPS, `${id} treads above deck: ${treads.max.y}`);
    assert.ok(treads.min.y >= -EPS, `${id} treads below ground: ${treads.min.y}`);
    assert.ok(treads.min.z >= 7.0 - EPS, `${id} treads intrude into deck: ${treads.min.z}`);
    near(pos(byId[id].matrix).y, 1.8, `${id} top anchor`);
  }
  near(pos(byId.tangga_kiri.matrix).x, -13.75, 'left stair x');
  near(pos(byId.tangga_kanan.matrix).x, 13.75, 'right stair x');
});

test('world: roof placeholders start at their supports', () => {
  near(bounds('atap').min.y, 6.3, 'main roof base');
  near(bounds('atap_atang').min.y, 6.3, 'atang roof base');
  const usei = bounds('atap_usei');
  near(usei.min.y, 4.1, 'veranda roof base');
  near(usei.max.y, 6.0, 'veranda roof ridge');
  assert.ok(usei.min.z >= 0.1 - EPS, `veranda roof cuts the front wall: ${usei.min.z}`);
});

// ---- Walkability on the real colliders ----
const colliders = [];
for (const inst of solved.instances) {
  for (const m of parts[inst.component].meshes) {
    if (!m.name.startsWith('col_')) continue;
    colliders.push(new Box3(new Vector3(...m.min), new Vector3(...m.max)).applyMatrix4(inst.matrix.clone().multiply(m.matrix)));
  }
}

function walk(start, input, seconds) {
  let s = createPlayerState(start);
  let maxY = s.position.y;
  for (let n = 0; n < seconds * 60; n++) {
    s = stepPlayer(s, { forward: 0, right: 0, jump: false, run: false, yaw: 0, ...input }, colliders, 1 / 60);
    maxY = Math.max(maxY, s.position.y);
  }
  return { s, maxY };
}

test('walk: each staircase climbs from the ground onto the deck', () => {
  for (const x of [-13.75, 13.75]) {
    const { s } = walk({ x, y: 0, z: 12 }, { forward: 1 }, 3.2);
    near(s.position.y, 1.8, `stair x=${x} height`);
    assert.ok(s.position.z < 7.0, `stair x=${x} reached deck (z=${s.position.z})`);
  }
});

test('walk: side door (x -6) leads into the middle room and the back wall stops the player', () => {
  const { s } = walk({ x: -6, y: 1.8, z: 5 }, { forward: 1 }, 6);
  near(s.position.y, 1.8, 'floor height');
  near(s.position.z, -9.94 + 0.3, 'stopped at back wall inner face + radius');
});

test('walk: back opening (x 0) leads into the atang annex', () => {
  const { s } = walk({ x: 0, y: 1.8, z: -5 }, { forward: 1 }, 6);
  near(s.position.y, 1.8, 'floor height');
  near(s.position.z, -14.94 + 0.3, 'stopped at atang back wall');
});

test('walk: front wall blocks at the old centre window (x 0)', () => {
  const { s } = walk({ x: 0, y: 1.8, z: 4 }, { forward: 1 }, 2);
  near(s.position.z, 0.06 + 0.3, 'stopped at front wall');
});

test('walk: front wall blocks where there is no door', () => {
  const { s } = walk({ x: -10, y: 1.8, z: 4 }, { forward: 1 }, 2);
  near(s.position.z, 0.06 + 0.3, 'stopped at front wall');
});

test('walk: veranda railing stops the player walking off the deck', () => {
  const { s } = walk({ x: -10, y: 1.8, z: 3 }, { forward: -1 }, 2);
  near(s.position.y, 1.8, 'still on deck');
  assert.ok(s.position.z < 7.0, `fell off deck (z=${s.position.z})`);
});
