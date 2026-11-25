// Generates the interior parts: dinding_dalam (inner walls), tiang_dalam (round posts that carry
// the roof frame) and rangka (the roof frame between the wall/post tops and the roofs).
// Run: npm run gen:interior   (then npm run build:models)
//
// The roof team builds on the rangka. Every roof is a gable; its underside must follow the
// rafter (kasau) tops. In rangka-local coordinates (origin = front wall top centre, world y 5.3):
//   atap (main)      : anchor_atap (0, 0.2, 0). Eaves z +0.5 / -10.5, ridge along x at z -5, 3.0 up, x ±15.8
//   atap_atang       : anchor_atap_atang (0, 0.2, -12.5). Eaves x ±3.2, ridge along z at x 0, 2.2 up
//   atap_usei_kiri   : anchor_atap_usei_kiri (-11.425, 0.2, 0.1). Eaves z 0.1 / 7.4, ridge at z 3.75, 2.0 up
//   atap_usei_tengah : anchor_atap_usei_tengah (0, 0.7, 0.1). Same shape, 0.5 m higher ("_ - _")
//   atap_usei_kanan  : anchor_atap_usei_kanan (11.425, 0.2, 0.1)
import path from 'node:path';
import * as THREE from 'three';
import { MAT, boxFromMin, cylinder, collider, anchor, merge, group, beam } from './lib/geom.mjs';
import { wall } from './lib/walls.mjs';
import { writeGLB } from './lib/glb-writer.mjs';

const OUT = path.resolve(import.meta.dirname, '../parts/interior');
const H = 3.5;                          // wall height = floor to frame
const TILE_DALAM = { u: 1.7, v: 2.25 };

function emit(name, root) {
  const info = writeGLB(path.join(OUT, `${name}.glb`), root);
  console.log(`parts/interior/${name}.glb: ${info.nodes} nodes, ${info.meshes} meshes, ${info.bytes} bytes`);
}

// ---------------- dinding_dalam: inner walls at x = ±7 (amin | tilong | amin) ----------------
// Origin = floor-top centre. Each wall has a doorway at z = -5.
function dindingDalam() {
  const parts = [];
  for (const [name, x] of [['dinding_dalam_kiri', -7], ['dinding_dalam_kanan', 7]]) {
    const w = wall(name, {
      axis: 'x', c: x, t: 0.1, a0: -9.94, a1: -0.06, H,
      openings: [{ a0: -5.425, a1: -4.575, y0: 0, y1: 1.8 }],
      faces: [{ side: 1, mat: MAT.motifDalam, tile: TILE_DALAM }, { side: -1, mat: MAT.motifDalam, tile: TILE_DALAM }],
      frameSide: x < 0 ? 1 : -1, // frames face the tilong (middle room)
    });
    parts.push(...w.meshes, ...w.colliders);
  }
  return group('dinding_dalam', parts, anchor('anchor_base', 0, 0, 0));
}

// ---------------- tiang_dalam: round posts from the floor up to the tie beams ----------------
// Along the ridge line z = -5, under the tie beams, clear of the doors at x = ±6.25 / 0 and the
// doorways in the inner walls (x = ±7). Each post has two carved brackets (siku) at the top.
export const POSTS_X = [-12.5, -10, -2.5, 2.5, 10, 12.5];
const POST_R = 0.13;
function tiangDalam() {
  const parts = [];
  for (const [i, x] of POSTS_X.entries()) {
    const n = String(i + 1).padStart(2, '0');
    parts.push(cylinder(`tiang_dalam_${n}`, MAT.kayuUlin, POST_R, H, x, H / 2, -5, 16));
    parts.push(collider(`col_tiang_dalam_${n}`, x - POST_R, 0, -5 - POST_R, x + POST_R, H, -5 + POST_R));
    // Brackets: thin triangles in the Y-Z plane, one on each side of the post, under the beam.
    const siku = [];
    for (const s of [-1, 1]) {
      const z0 = -5 + s * POST_R, z1 = -5 + s * 0.75;
      siku.push(beam(`s${s}a`, MAT.motifDalam, [x, H - 0.05, z0], [x, H - 0.05, z1], 0.05, 0.1));
      siku.push(beam(`s${s}b`, MAT.motifDalam, [x, H - 0.65, z0], [x, H - 0.1, z1], 0.05, 0.1));
    }
    parts.push(merge(`siku_${n}`, siku));
  }
  return group('tiang_dalam', parts, anchor('anchor_base', 0, 0, 0));
}

// ---------------- rangka: roof frames ----------------
const K = () => MAT.kayuGelap;

// One gable frame with its ridge along x. Pushes meshes into `out` (arrays per member kind).
//   x0..x1          extent along the ridge (rafters), trusses at `trusses`
//   zA > zR > zB    front eave, ridge, back eave;  wA / wB: where the truss rafters start
//   yBase, rise     roof underside at the eaves / ridge height above that
//   tieTop          top of the tie beams the trusses stand on
function gableFrame(out, { x0, x1, trusses, zA, zR, zB, wA, wB, yBase, rise, tieTop }) {
  const top = yBase + rise;
  const roof = (z) => yBase + rise * (z >= zR ? (zA - z) / (zA - zR) : (z - zB) / (zR - zB));
  const xs = [];
  for (let x = x0; x <= x1 + 1e-9; x += 0.625) xs.push(+x.toFixed(4));
  if (xs[xs.length - 1] < x1 - 1e-6) xs.push(x1);

  // kasau (common rafters): top face on the roof plane
  for (const x of xs) {
    out.kasau.push(beam('k', K(), [x, yBase, zA], [x, top, zR], 0.06, 0.08, true));
    out.kasau.push(beam('k', K(), [x, yBase, zB], [x, top, zR], 0.06, 0.08, true));
  }
  // gording (purlins): three per slope under the kasau, plus the ridge beam
  for (const zE of [zA, zB]) {
    for (const t of [0.25, 0.5, 0.75]) {
      const z = zE + t * (zR - zE);
      out.gording.push(boxFromMin('g', K(), x0 - 0.1, roof(z) - 0.2, z - 0.05, x1 + 0.1, roof(z) - 0.08, z + 0.05));
    }
  }
  out.bubungan.push(boxFromMin('r', K(), x0 - 0.3, top - 0.32, zR - 0.08, x1 + 0.3, top - 0.1, zR + 0.08));
  // longitudinal beam linking the king posts, and wind braces between neighbouring trusses
  const yMid = tieTop + 0.35 * (top - tieTop);
  out.kuda.push(boxFromMin('l', K(), trusses[0], yMid - 0.06, zR - 0.04, trusses[trusses.length - 1], yMid + 0.06, zR + 0.04));
  for (let i = 0; i < trusses.length - 1; i++) {
    const [xa, xb] = i % 2 ? [trusses[i + 1], trusses[i]] : [trusses[i], trusses[i + 1]];
    out.kuda.push(beam('w', K(), [xa, tieTop + 0.1, zR], [xb, top - 0.4, zR], 0.05, 0.08));
  }
  // kuda-kuda (trusses): principal rafters under the purlins, king post, struts, collar ties
  for (const x of trusses) {
    out.kuda.push(beam('p', K(), [x, roof(wA) - 0.2, wA], [x, top - 0.2, zR], 0.1, 0.16, true));
    out.kuda.push(beam('p', K(), [x, roof(wB) - 0.2, wB], [x, top - 0.2, zR], 0.1, 0.16, true));
    out.kuda.push(boxFromMin('kp', K(), x - 0.07, tieTop, zR - 0.07, x + 0.07, top - 0.32, zR + 0.07));
    for (const w of [wA, wB]) {
      const z = (w + zR) / 2;
      out.kuda.push(beam('st', K(), [x, tieTop + 0.05, zR + Math.sign(w - zR) * 0.08], [x, roof(z) - 0.4, z], 0.08, 0.08));
    }
    const yc = tieTop + 0.65 * (top - 0.36 - tieTop);       // collar tie height
    const t = (yc + 0.36 - yBase) / rise;                    // fraction up the slope where it meets the rafters
    const zf = zA - t * (zA - zR), zb = zB + t * (zR - zB);
    for (const dx of [-0.08, 0.08]) out.kuda.push(boxFromMin('c', K(), x + dx - 0.025, yc - 0.06, zb, x + dx + 0.025, yc + 0.06, zf));
  }
}

// Bakes a rotation about Y (degrees) into the meshes, so a frame built along x can run along z.
function rotateY(meshes, deg) {
  const m = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(deg));
  for (const mesh of meshes) { mesh.updateMatrix(); mesh.applyMatrix4(m); }
  return meshes;
}

const newOut = () => ({ plate: [], tie: [], kuda: [], kasau: [], gording: [], bubungan: [] });

function rangka() {
  const main = newOut(), atang = newOut(), usei = newOut();
  const range = (a, b, step) => { const r = []; for (let v = a; v <= b + 1e-9; v += step) r.push(+v.toFixed(4)); return r; };

  // ---- main body (tilong + amin): plates on the walls, tie beams every 2.5 m, gable frame
  main.plate.push(boxFromMin('pd', K(), -15.1, 0, -0.1, 15.1, 0.2, 0.1));
  main.plate.push(boxFromMin('pb', K(), -15.1, 0, -10.1, 15.1, 0.2, -9.9));
  main.plate.push(boxFromMin('pl', K(), -15.1, 0, -9.9, -14.9, 0.2, -0.1));
  main.plate.push(boxFromMin('pr', K(), 14.9, 0, -9.9, 15.1, 0.2, -0.1));
  for (const x of range(-15, 15, 2.5)) main.tie.push(boxFromMin('t', K(), x - 0.08, 0, -10.1, x + 0.08, 0.2, 0.1));
  gableFrame(main, { x0: -15, x1: 15, trusses: range(-15, 15, 2.5), zA: 0.5, zR: -5, zB: -10.5, wA: 0, wB: -10, yBase: 0.2, rise: 3.0, tieTop: 0.2 });

  // ---- atang: built along x in a local frame, then turned so its ridge runs along z.
  // local x = -world z, local z = world x.
  atang.plate.push(boxFromMin('pal', K(), -2.6, 0, -15.1, -2.4, 0.2, -10.1));
  atang.plate.push(boxFromMin('par', K(), 2.4, 0, -15.1, 2.6, 0.2, -10.1));
  atang.plate.push(boxFromMin('pab', K(), -2.4, 0, -15.1, 2.4, 0.2, -14.9));
  for (const z of [-11.25, -12.5, -13.75, -15]) atang.tie.push(boxFromMin('at', K(), -2.6, 0, z - 0.08, 2.6, 0.2, z + 0.08));
  const a = newOut();
  gableFrame(a, { x0: 10, x1: 15.5, trusses: [11.25, 12.5, 13.75, 15], zA: 3.2, zR: 0, zB: -3.2, wA: 2.5, wB: -2.5, yBase: 0.2, rise: 2.2, tieTop: 0.2 });
  for (const k of Object.keys(a)) atang[k].push(...rotateY(a[k], 90));

  // ---- usei: plate on the usei posts, tie beams back to the front wall, three gable frames
  // in a "_ - _" layout: kiri and kanan at the main roof level, tengah (over the tilong) 0.5 m higher.
  const POST_Z = 6.7;                                     // tiang_usei row (world z)
  usei.plate.push(boxFromMin('up', K(), -15.1, 0, POST_Z - 0.12, 15.1, 0.2, POST_Z + 0.12));
  for (const x of range(-15, 15, 2.5)) usei.tie.push(boxFromMin('ut', K(), x - 0.08, 0, 0.1, x + 0.08, 0.2, POST_Z + 0.12));
  const RAISE = 0.5;
  const sec = { zA: 7.4, zR: 3.75, zB: 0.1, wA: POST_Z, wB: 0.6, rise: 2.0 };
  gableFrame(usei, { ...sec, x0: -15, x1: -7.5, trusses: range(-15, -7.5, 2.5), yBase: 0.2, tieTop: 0.2 });
  gableFrame(usei, { ...sec, x0: 7.5, x1: 15, trusses: range(7.5, 15, 2.5), yBase: 0.2, tieTop: 0.2 });
  // tengah: short posts and a raised plate/tie level lift the middle frame
  for (const x of range(-7.5, 7.5, 2.5)) {
    for (const z of [0.3, POST_Z]) usei.kuda.push(boxFromMin('sp', K(), x - 0.08, 0.2, z - 0.08, x + 0.08, 0.2 + RAISE - 0.2, z + 0.08));
    usei.tie.push(boxFromMin('rt', K(), x - 0.08, RAISE, 0.2, x + 0.08, RAISE + 0.2, POST_Z + 0.08));
  }
  for (const z of [0.3, POST_Z]) usei.plate.push(boxFromMin('rp', K(), -7.6, RAISE, z - 0.1, 7.6, RAISE + 0.2, z + 0.1));
  gableFrame(usei, { ...sec, x0: -7.8, x1: 7.8, trusses: range(-7.5, 7.5, 2.5), yBase: 0.2 + RAISE, tieTop: 0.2 + RAISE });

  const kids = [];
  for (const [name, o] of [['rangka', main], ['rangka_atang', atang], ['rangka_usei', usei]]) {
    if (o.plate.length) kids.push(merge(`${name}_balok_keliling`, o.plate));
    kids.push(merge(`${name}_balok_tarik`, o.tie));
    kids.push(merge(`${name}_kuda_kuda`, o.kuda));
    kids.push(merge(`${name}_gording`, [...o.gording, ...o.bubungan]));
    kids.push(merge(`${name}_kasau`, o.kasau));
  }
  return group('rangka', kids,
    anchor('anchor_base', 0, 0, 0),
    anchor('anchor_atap', 0, 0.2, 0),
    anchor('anchor_atap_atang', 0, 0.2, -12.5),
    anchor('anchor_atap_usei_kiri', -11.425, 0.2, 0.1),
    anchor('anchor_atap_usei_tengah', 0, 0.2 + RAISE, 0.1),
    anchor('anchor_atap_usei_kanan', 11.425, 0.2, 0.1));
}

emit('dinding_dalam', dindingDalam());
emit('tiang_dalam', tiangDalam());
emit('rangka', rangka());
