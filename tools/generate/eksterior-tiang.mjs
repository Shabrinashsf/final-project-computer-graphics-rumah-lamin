// Deck pillars (kolong). Two variants share one contract so the deck can mix them:
//   tiang       plain round post, used for most of the grid
//   tiang_ukir  carved figure post (patung tiang panggung), used along the front row
// Contract for both (local space, origin = bottom centre):
//   y 0 … 1.6 exactly (ground to deck underside), anchor_ground (0, 0, 0), anchor_top (0, 1.6, 0)
//   tiang:      footprint radius ≤ 0.2,  collider col_tiang      x/z ±0.16
//   tiang_ukir: footprint radius ≤ 0.28, collider col_tiang_ukir x/z ±0.2
import { MAT, cylinder, collider, anchor, merge, group } from '../lib/geom.mjs';

export const TIANG_H = 1.6;

export function tiang() {
  const body = merge('tiang_body', [
    cylinder('base', MAT.kayuUlin, 0.2, 0.15, 0, 0.075, 0, 8),
    cylinder('shaft', MAT.kayuUlin, 0.16, 1.3, 0, 0.8, 0, 8),
    cylinder('ring', MAT.kayuUlin, 0.19, 0.06, 0, 0.8, 0, 8),
    cylinder('cap', MAT.kayuUlin, 0.2, 0.15, 0, TIANG_H - 0.075, 0, 8),
  ]);
  return group('tiang', body, collider('col_tiang', -0.16, 0, -0.16, 0.16, TIANG_H, 0.16),
    anchor('anchor_ground', 0, 0, 0), anchor('anchor_top', 0, TIANG_H, 0));
}

// Carved figure pillar. Placeholder shape until the carved version lands.
export function tiangUkir() {
  const body = merge('tiang_ukir_body', [
    cylinder('base', MAT.kayuUlin, 0.26, 0.15, 0, 0.075, 0, 12),
    cylinder('shaft', MAT.kayuUlin, 0.22, 1.3, 0, 0.8, 0, 12),
    cylinder('cap', MAT.kayuUlin, 0.26, 0.15, 0, TIANG_H - 0.075, 0, 12),
  ]);
  return group('tiang_ukir', body, collider('col_tiang_ukir', -0.2, 0, -0.2, 0.2, TIANG_H, 0.2),
    anchor('anchor_ground', 0, 0, 0), anchor('anchor_top', 0, TIANG_H, 0));
}
