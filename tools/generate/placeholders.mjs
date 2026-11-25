// Generates the whitebox placeholders: roofs into parts/atap/ and the guardian statue into
// parts/props/ (then run npm run build:models).
// They sit on the roof frame (parts/interior/rangka.glb) and the usei posts (pagar). The roof
// underside follows the rafters, see tools/generate/interior.mjs. Run: npm run gen:placeholder
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { MAT, meterUVs, boxFromMin, anchor, collider, group } from '../lib/geom.mjs';
import { writeGLB } from '../lib/glb-writer.mjs';

const PARTS = path.resolve(import.meta.dirname, '../../parts');
const W = MAT.whitebox;

// Prism along world X: `pts` are [z, y] pairs of the cross-section, extruded over x ±halfX.
function prismX(name, pts, halfX) {
  // Shape x = -z_world; after rotateY(+90deg) local z -> world x and local x -> world -z.
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: 2 * halfX, bevelEnabled: false });
  g.translate(0, 0, -halfX);
  g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(meterUVs(g), W);
  m.name = name;
  return m;
}

// Prism along world Z: `pts` are [x, y] pairs, extruded from z0 to z1.
function prismZ(name, pts, z0, z1) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false });
  g.translate(0, 0, z0);
  const m = new THREE.Mesh(meterUVs(g), W);
  m.name = name;
  return m;
}

// ---- a) atap: main gable roof. Origin = rangka.anchor_atap (world 0, 6.5, 0). ----
function buildAtap() {
  const gable = prismX('atap_gable', [[0.5, 0], [-10.5, 0], [-5, 3.0]], 15.8);
  const ridge = boxFromMin('atap_ridge', W, -15.9, 2.95, -5.15, 15.9, 3.15, -4.85);
  return group('atap', anchor('anchor_base', 0, 0, 0), gable, ridge);
}

// ---- b) atap_atang: roof over the rear annex. Origin = rangka.anchor_atap_atang (world 0, 6.5, -12.5). ----
function buildAtapAtang() {
  const gable = prismZ('atap_atang_gable', [[-3.2, 0], [3.2, 0], [0, 2.2]], -3.2, 2.5);
  return group('atap_atang', anchor('anchor_base', 0, 0, 0), gable);
}

// ---- c) usei roofs, "_ - _": atap_usei_sisi (used for kiri and kanan) and atap_usei_tengah.
// Origin = rangka.anchor_atap_usei_* (back eave line at the front wall, world z 0.1). Gable along
// x from the back eave (z 0) to the front eave (z 7.3, past the usei posts), ridge 2.0 m up.
const USEI = [[0, 0], [7.3, 0], [3.65, 2.0]];
function buildAtapUsei(name, halfX) {
  const gable = prismX(`${name}_gable`, USEI, halfX);
  const ridge = boxFromMin(`${name}_ridge`, W, -halfX - 0.1, 1.95, 3.5, halfX + 0.1, 2.1, 3.8);
  return group(name, anchor('anchor_base', 0, 0, 0), gable, ridge);
}

// ---- d) patung: Blontang guardian statue (props area). Origin = bottom centre; it stands on
// the ground beside a stair, at tangga.anchor_patung_kiri / _kanan.
function buildPatung() {
  const post = boxFromMin('patung_tiang', W, -0.25, 0, -0.25, 0.25, 4.6, 0.25);
  const head = boxFromMin('patung_kepala', W, -0.35, 4.6, -0.35, 0.35, 5.3, 0.35);
  return group('patung', anchor('anchor_ground', 0, 0, 0), post, head,
    collider('col_patung', -0.35, 0, -0.35, 0.35, 5.3, 0.35));
}

const outputs = [
  ['atap/atap.glb', buildAtap()],
  ['atap/atap_atang.glb', buildAtapAtang()],
  ['atap/atap_usei_sisi.glb', buildAtapUsei('atap_usei_sisi', 3.925)],   // x -15.35 … -7.5 (kiri), mirrored for kanan
  ['atap/atap_usei_tengah.glb', buildAtapUsei('atap_usei_tengah', 7.8)], // x ±7.8, over the tilong
  ['props/patung.glb', buildPatung()],
];

for (const [file, root] of outputs) {
  const out = path.join(PARTS, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const info = writeGLB(out, root);
  console.log(`${path.relative(process.cwd(), out)}: ${info.nodes} nodes, ${info.meshes} meshes, ${info.bytes} bytes`);
}
