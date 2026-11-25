// Staircase from the usei (veranda) edge down to the ground. Used twice (x = ±6.25).
// Contract (local space, origin = top landing at the deck front edge; the stair runs toward +z
// and down to the ground at y = -1.8):
//   anchors  anchor_top (0, 0, 0) · anchor_ground (0, -1.8, 3.17)
//            anchor_patung_kiri (-1.8, -1.8, 2.57) · anchor_patung_kanan (1.8, -1.8, 2.57)
//   steps    N = 9, rise 0.18, run 0.28; step i (1…9) top at y = -0.18·i over z (i-1)·0.28 … i·0.28
//   colliders (walking depends on them, keep exactly):
//            col_step_i  x ±0.7, y -1.8 … -0.18·i, z (i-1)·0.28 … i·0.28
//            col_rail_l / col_rail_r  x ∓(0.74 … 0.82), y -1.8 … 0.9, z 0 … 2.52
//   extents  visible geometry within x ±0.9 (deck pillars stand 1.25 m to each side)
import { MAT, box, boxFromMin, collider, anchor, merge, group } from '../lib/geom.mjs';

export const STEP = { n: 9, rise: 0.18, run: 0.28, halfW: 0.7 };

function colliders() {
  const { n, rise, run, halfW } = STEP;
  const cols = [];
  for (let i = 1; i <= n; i++) cols.push(collider(`col_step_${i}`, -halfW, -1.8, (i - 1) * run, halfW, -rise * i, i * run));
  cols.push(collider('col_rail_l', -0.82, -1.8, 0, -0.74, 0.9, n * run));
  cols.push(collider('col_rail_r', 0.74, -1.8, 0, 0.82, 0.9, n * run));
  return cols;
}

function anchors() {
  return [
    anchor('anchor_top', 0, 0, 0), anchor('anchor_ground', 0, -1.8, 3.17),
    anchor('anchor_patung_kiri', -1.8, -1.8, 2.57), anchor('anchor_patung_kanan', 1.8, -1.8, 2.57),
  ];
}

// Plank stair (placeholder until the notched-log version lands).
export function tangga() {
  const { n, rise, run, halfW } = STEP;
  const treads = [], wood = [];
  for (let i = 1; i <= n; i++) {
    const top = -rise * i, z0 = (i - 1) * run, z1 = i * run;
    treads.push(boxFromMin(`tread_${i}`, MAT.kayuUlin, -halfW, top - 0.05, z0, halfW, top, z1));
  }
  for (const s of [-1, 1]) {
    for (const i of [1, 5, 9]) wood.push(box('post', MAT.kayuGelap, 0.06, 0.9, 0.06, s * 0.78, -rise * i + 0.45, (i - 0.5) * run));
  }
  return group('tangga', merge('tangga_treads', treads), merge('tangga_kayu', wood), colliders(), anchors());
}

export { colliders as tanggaColliders, anchors as tanggaAnchors };
