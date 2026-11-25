// Generates the exterior parts that follow the front layout of the reference Lamin:
// lantai (deck), dinding_luar (outer walls), pagar (usei railing) and tiang_usei (usei posts).
// tiang.glb and tangga.glb in parts/eksterior/ are delivered models and are not touched.
// Run: npm run gen:eksterior   (then npm run build:models)
//
// Layout (world, deck top y 1.8): main body x ±15, z -10..0; atang x ±2.5, z -15..-10;
// usei (veranda) z 0..7; two stairs at x = ±6.25, in front of the two doors.
import path from 'node:path';
import { MAT, boxFromMin, cylinder, collider, anchor, merge, group } from '../lib/geom.mjs';
import { wall } from '../lib/walls.mjs';
import { writeGLB } from '../lib/glb-writer.mjs';

const OUT = path.resolve(import.meta.dirname, '../../parts/eksterior');
const f2 = (n) => String(n).padStart(2, '0');

export const STAIR_X = 6.25;       // stairs and doors at x = ±6.25, midway between deck pillars
const H = 3.5;                     // wall height above the deck
const DOOR = { w: 0.85, h: 1.8 };
const WIN = { w: 0.8, y0: 0.9, y1: 2.1 };
const TILE_USEI = { u: 3.375, v: 2.25 };  // motif_usei.jpg is 3:2
const TILE_DALAM = { u: 1.7, v: 2.25 };   // motif_dalam.jpg is ~3:4

function emit(name, root) {
  const info = writeGLB(path.join(OUT, `${name}.glb`), root);
  console.log(`parts/eksterior/${name}.glb: ${info.nodes} nodes, ${info.meshes} meshes, ${info.bytes} bytes`);
}

// ---------------- lantai: deck slab + atang deck, pillar grid, attachment anchors ----------------
function lantai() {
  const kids = [
    boxFromMin('lantai_slab', MAT.kayuUlin, -15.2, -0.2, -10.2, 15.2, 0, 7.0),
    collider('col_lantai', -15.2, -0.2, -10.2, 15.2, 0, 7.0),
    boxFromMin('lantai_atang', MAT.kayuUlin, -2.7, -0.2, -15.2, 2.7, 0, -10.2),
    collider('col_lantai_atang_0', -2.7, -0.2, -15.2, 2.7, 0, -10.2),
    anchor('anchor_base', 0, -1.8, 0),
    anchor('anchor_dinding', 0, 0, 0),
    anchor('anchor_interior', 0, 0, 0),
    anchor('anchor_pagar', 0, 0, 7),
    anchor('anchor_tangga_kiri', -STAIR_X, 0, 7),
    anchor('anchor_tangga_kanan', STAIR_X, 0, 7),
  ];
  let n = 0;
  for (const z of [-10, -5, 0, 2.5, 5, 6.8])
    for (let c = 0; c < 13; c++) kids.push(anchor(`anchor_tiang_${f2(n++)}`, -15 + 2.5 * c, -0.2, z));
  for (const z of [-12.5, -15])
    for (const x of [-2.5, 0, 2.5]) kids.push(anchor(`anchor_tiang_${f2(n++)}`, x, -0.2, z));
  return group('lantai', kids);
}

// ---------------- dinding_luar: outer walls with doors (front) and windows (right, back) ----------------
function dindingLuar() {
  const parts = [];
  const add = (w) => parts.push(...w.meshes, ...w.colliders);
  const door = (a) => ({ a0: a - DOOR.w / 2, a1: a + DOOR.w / 2, y0: 0, y1: DOOR.h });
  const win = (a) => ({ a0: a - WIN.w / 2, a1: a + WIN.w / 2, y0: WIN.y0, y1: WIN.y1 });
  const dalam = { mat: MAT.motifDalam, tile: TILE_DALAM };

  // Front wall: faces the usei (veranda) → motif_usei outside, motif_dalam inside.
  add(wall('dinding_depan', {
    axis: 'z', c: 0, t: 0.12, a0: -15, a1: 15, H,
    openings: [door(-STAIR_X), door(STAIR_X)],
    faces: [{ side: 1, mat: MAT.motifUsei, tile: TILE_USEI }, { side: -1, ...dalam }],
    frameSide: 1,
  }));
  // Back wall: windows into the side rooms and the middle room, doorway to the atang.
  // The middle part (x ±2.5) faces into the atang, so it is motif_dalam on both sides.
  add(wall('dinding_belakang', {
    axis: 'z', c: -10, t: 0.12, a0: -15, a1: 15, H,
    openings: [win(-11), win(-4.75), door(0), win(4.75), win(11)],
    splits: [-2.5, 2.5],
    faces: [
      { side: -1, mat: (a) => (Math.abs(a) < 2.5 ? MAT.motifDalam : null), tile: TILE_DALAM },
      { side: 1, ...dalam },
    ],
    frameSide: -1,
  }));
  // Side walls (between the front and back walls). Only the right wall has windows.
  add(wall('dinding_kiri', {
    axis: 'x', c: -15, t: 0.12, a0: -9.94, a1: -0.06, H,
    faces: [{ side: 1, ...dalam }],
  }));
  add(wall('dinding_kanan', {
    axis: 'x', c: 15, t: 0.12, a0: -9.94, a1: -0.06, H,
    openings: [win(-7.5), win(-2.5)],
    faces: [{ side: -1, ...dalam }],
    frameSide: 1,
  }));
  // Atang (rear annex) walls.
  add(wall('dinding_atang_belakang', {
    axis: 'z', c: -15, t: 0.12, a0: -2.56, a1: 2.56, H,
    faces: [{ side: 1, ...dalam }],
  }));
  add(wall('dinding_atang_kiri', {
    axis: 'x', c: -2.5, t: 0.12, a0: -14.94, a1: -10.06, H,
    faces: [{ side: 1, ...dalam }],
  }));
  add(wall('dinding_atang_kanan', {
    axis: 'x', c: 2.5, t: 0.12, a0: -14.94, a1: -10.06, H,
    faces: [{ side: -1, ...dalam }],
  }));

  return group('dinding_luar', parts,
    anchor('anchor_base', 0, 0, 0),
    anchor('anchor_rangka', 0, H, 0)); // roof frame (interior/rangka.glb) sits on the wall tops
}

// ---------------- pagar: usei railing with stair gaps ----------------
// Local origin = deck front edge centre (world z 7). The railing runs along z = -0.1.
function pagar() {
  const kayu = [], panels = [], cols = [];
  const GAP = 1.75;                         // stair openings, centred on x = ±STAIR_X
  const RAIL_TOP = 1.08;
  const TILE_PAGAR = { u: 0.88 * (686 / 112), v: 0.88 };
  const segs = [[-15.1, -STAIR_X - GAP / 2], [-STAIR_X + GAP / 2, STAIR_X - GAP / 2], [STAIR_X + GAP / 2, 15.1]];

  // Front railing segments: bottom rail, handrail, motif panel, a short post at each end.
  segs.forEach(([x0, x1], i) => {
    kayu.push(boxFromMin(`rail_b${i}`, MAT.kayuGelap, x0, 0.04, -0.15, x1, 0.12, -0.05));
    kayu.push(boxFromMin(`rail_t${i}`, MAT.kayuGelap, x0, 1.0, -0.16, x1, RAIL_TOP, -0.04));
    panels.push(boxFromMin(`panel${i}`, MAT.motifPagar, x0, 0.12, -0.12, x1, 1.0, -0.08, TILE_PAGAR));
    for (const x of [x0, x1]) kayu.push(boxFromMin(`rp${i}${x}`, MAT.kayuGelap, x - 0.05, 0, -0.15, x + 0.05, RAIL_TOP + 0.06, -0.05));
    cols.push(collider(`col_pagar_depan_${i}`, x0, 0, -0.16, x1, RAIL_TOP, -0.04));
  });

  // Side railings at x = ±15.1, from the corner usei post back to the wall (world z 0.06).
  for (const s of [-1, 1]) {
    const x0 = s * 15.1 - 0.06, x1 = s * 15.1 + 0.06;
    kayu.push(boxFromMin(`side_b${s}`, MAT.kayuGelap, x0, 0.04, -6.94, x1, 0.12, -0.45));
    kayu.push(boxFromMin(`side_t${s}`, MAT.kayuGelap, x0, 1.0, -6.94, x1, RAIL_TOP, -0.45));
    kayu.push(boxFromMin(`side_post${s}`, MAT.kayuGelap, x0, 0, -3.78, x1, RAIL_TOP, -3.62));
    panels.push(boxFromMin(`side_panel${s}`, MAT.motifPagar, s * 15.1 - 0.02, 0.12, -6.94, s * 15.1 + 0.02, 1.0, -0.45, TILE_PAGAR));
    cols.push(collider(`col_pagar_${s < 0 ? 'kiri' : 'kanan'}`, x0, 0, -6.94, x1, RAIL_TOP, -0.45));
  }

  const isSide = (m) => m.name.startsWith('side');
  const isLeft = (m) => m.name.endsWith('-1');
  return group('pagar',
    merge('pagar_kayu', kayu.filter((m) => !isSide(m))),
    merge('pagar_panel', panels.filter((m) => !isSide(m))),
    merge('pagar_sisi_kiri_kayu', kayu.filter((m) => isSide(m) && isLeft(m))),
    merge('pagar_sisi_kanan_kayu', kayu.filter((m) => isSide(m) && !isLeft(m))),
    panels.filter(isSide).map((m) => { m.name = `pagar_sisi_${isLeft(m) ? 'kiri' : 'kanan'}_panel`; return m; }),
    cols,
    anchor('anchor_base', 0, 0, 0));
}

// ---------------- tiang_usei: round posts that carry the usei roof frame ----------------
// Same origin as pagar (deck front edge). One row just behind the railing, every 2.5 m
// (x = 5 / 7.5 flank the stair openings), from the deck up to the wall-top level (3.5 m).
export const USEI_POST = { z: -0.3, r: 0.12 };
function tiangUsei() {
  const parts = [];
  let i = 0;
  for (let x = -15; x <= 15 + 1e-9; x += 2.5) {
    const n = String(++i).padStart(2, '0');
    parts.push(cylinder(`tiang_usei_${n}`, MAT.kayuUlin, USEI_POST.r, H, x, H / 2, USEI_POST.z, 16));
    parts.push(collider(`col_tiang_usei_${n}`, x - USEI_POST.r, 0, USEI_POST.z - USEI_POST.r, x + USEI_POST.r, H, USEI_POST.z + USEI_POST.r));
  }
  return group('tiang_usei', parts, anchor('anchor_base', 0, 0, 0));
}

emit('lantai', lantai());
emit('dinding_luar', dindingLuar());
emit('pagar', pagar());
emit('tiang_usei', tiangUsei());
