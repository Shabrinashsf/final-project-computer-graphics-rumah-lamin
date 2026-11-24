// Generates the whitebox roof placeholders into public/components/placeholder/.
// Sized for the current exterior (deck top y 1.8, walls x ±15 / z -10..0, atang z -10..-15,
// veranda z 0..7). Run: npm run gen:placeholder
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { MAT, meterUVs, boxFromMin, anchor, group } from './lib/geom.mjs';
import { writeGLB } from './lib/glb-writer.mjs';

const OUT = path.resolve(import.meta.dirname, '../public/components/placeholder');
fs.mkdirSync(OUT, { recursive: true });
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

// ---- a) atap: main gable roof. Origin = front wall-top centre (world 0, 6.3, 0). ----
function buildAtap() {
  const gable = prismX('atap_gable', [[0.3, 0], [-10.8, 0], [-5, 3.0]], 15.8);
  const ridge = boxFromMin('atap_ridge', W, -15.9, 2.95, -5.15, 15.9, 3.15, -4.85);
  return group('atap', anchor('anchor_base', 0, 0, 0), gable, ridge);
}

// ---- b) atap_atang: roof over the rear annex. Origin = annex wall-top centre (world 0, 6.3, -12.5). ----
function buildAtapAtang() {
  const gable = prismZ('atap_atang_gable', [[-3.2, 0], [3.2, 0], [0, 2.2]], -3.2, 2.5);
  return group('atap_atang', anchor('anchor_base', 0, 0, 0), gable);
}

// ---- c) atap_usei: veranda roof, a gable like the main roof. Origin = top of the front railing
// posts (world 0, 4.1, 7). Spans from the eave 0.4 m past the posts back to the front wall (local z -6.9).
function buildAtapUsei() {
  const gable = prismX('atap_usei_gable', [[0.4, 0], [-6.9, 0], [-3.25, 1.8]], 15.4);
  const ridge = boxFromMin('atap_usei_ridge', W, -15.5, 1.75, -3.4, 15.5, 1.9, -3.1);
  return group('atap_usei', anchor('anchor_base', 0, 0, 0), gable, ridge);
}

const outputs = [
  ['atap.glb', buildAtap()],
  ['atap_atang.glb', buildAtapAtang()],
  ['atap_usei.glb', buildAtapUsei()],
];

for (const [file, root] of outputs) {
  const info = writeGLB(path.join(OUT, file), root);
  console.log(`${path.relative(process.cwd(), path.join(OUT, file))}: ${info.nodes} nodes, ${info.meshes} meshes, ${info.bytes} bytes`);
}
