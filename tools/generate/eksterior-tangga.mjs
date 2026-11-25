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
import { MAT, box, boxFromMin, cylinder, collider, anchor, merge, group } from '../lib/geom.mjs';

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

// Notched-log stair: two round log stringers, thick treads seated in the notches, round-pole rails.
const SLOPE = STEP.rise / STEP.run;
const lineY = (z) => -SLOPE * (z + STEP.run / 2); // line through the middle of every tread top

// Round pole along the slope between two z positions; centre line y = lineY(z) + dy.
function slopedPole(name, mat, r, x, z0, z1, dy, seg = 10) {
  const dz = z1 - z0, dyy = -SLOPE * dz, len = Math.hypot(dz, dyy);
  const m = cylinder(name, mat, r, len, x, lineY((z0 + z1) / 2) + dy, (z0 + z1) / 2, seg, 0.5);
  m.rotation.x = Math.atan2(dz, dyy);
  return m;
}

export function tangga() {
  const { n, rise, run, halfW } = STEP;
  const treads = [], wood = [];
  const logDy = -0.22; // log axis below the tread line: log top sits just under the tread tops
  for (const s of [-1, 1]) {
    wood.push(slopedPole('log', MAT.kayuGelap, 0.11, s * 0.6, -0.1, n * run, logDy, 12));
    // rail posts and sloped round rail
    for (const i of [1, 4, 7, 9]) {
      const z = (i - 0.5) * run, bottom = -rise * i - 0.1, top = lineY(z) + 0.9;
      wood.push(cylinder('post', MAT.kayuGelap, 0.045, top - bottom, s * 0.78, (top + bottom) / 2, z, 8, 0.5));
    }
    wood.push(slopedPole('rail', MAT.kayuGelap, 0.04, s * 0.78, 0.1, n * run, 0.9, 8));
  }
  for (let i = 1; i <= n; i++) {
    const top = -rise * i, z0 = (i - 1) * run, z1 = i * run;
    treads.push(boxFromMin(`tread_${i}`, MAT.kayuUlin, -halfW, top - 0.08, z0, halfW, top, z1));
  }
  return group('tangga', merge('tangga_treads', treads), merge('tangga_kayu', wood), colliders(), anchors());
}

export { colliders as tanggaColliders, anchors as tanggaAnchors };
