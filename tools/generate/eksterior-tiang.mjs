// Deck pillars (kolong). Two variants share one contract so the deck can mix them:
//   tiang       plain round post, used for most of the grid
//   tiang_ukir  carved figure post (patung tiang panggung), used along the front row
// Contract for both (local space, origin = bottom centre):
//   y 0 … 1.6 exactly (ground to deck underside), anchor_ground (0, 0, 0), anchor_top (0, 1.6, 0)
//   tiang:      footprint radius ≤ 0.2,  collider col_tiang      x/z ±0.16
//   tiang_ukir: footprint radius ≤ 0.28, collider col_tiang_ukir x/z ±0.2
import * as THREE from 'three';
import { MAT, meterUVs, cylinder, boxFromMin, collider, anchor, merge, group } from '../lib/geom.mjs';

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

// ---- helpers for the carved figure (local to this file) ----
const UP = new THREE.Vector3(0, 1, 0);

// Solid of revolution from a profile [[r, y], ...] (bottom → top). Positioned at (x, y, z),
// optionally squashed front-to-back (sz) / side-to-side (sx) so it reads as carved, not turned.
function lathe(name, material, profile, { x = 0, y = 0, z = 0, sx = 1, sz = 1, seg = 12, tile = 1 } = {}) {
  const g = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg);
  const m = new THREE.Mesh(meterUVs(g, tile), material);
  m.name = name;
  m.position.set(x, y, z);
  m.scale.set(sx, 1, sz);
  return m;
}

// Rounded limb from p0 to p1, radius r0 at p0 tapering to r1 at p1 (capsule-like ends).
function limb(name, material, p0, p1, r0, r1, seg = 8) {
  const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1);
  const len = a.distanceTo(b);
  const prof = [[0, -r0 * 0.6], [r0 * 0.75, -r0 * 0.35], [r0, 0.15 * len], [(r0 + r1) / 2, 0.55 * len], [r1, 0.9 * len],
    [r1 * 0.7, len + r1 * 0.3], [0, len + r1 * 0.55]];
  const m = lathe(name, material, prof, { seg });
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(UP, b.sub(a).normalize());
  return m;
}

function ball(name, material, r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 8) {
  const m = new THREE.Mesh(meterUVs(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), 0.5), material);
  m.name = name;
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

// Flat disc facing +Z (eyes, ear plugs).
function disc(name, material, r, depth, x, y, z, seg = 10) {
  const m = cylinder(name, material, r, depth, x, y, z, seg, 0.5);
  m.rotation.x = Math.PI / 2;
  return m;
}

// Carved guardian figure (hampatong) standing on a pedestal, carrying the deck on its headdress:
//   0.00-0.10 square pedestal · 0.10-0.30 round plinth · 0.30-0.66 legs · 0.62-1.02 torso + arms
//   1.00-1.36 big head with face toward +Z · 1.34-1.47 headdress crown · 1.47-1.60 capital block
export function tiangUkir() {
  const W = MAT.kayuUlin, D = MAT.kayuGelap;
  const wood = [], dark = [];

  // pedestal + plinth
  wood.push(boxFromMin('pedestal', W, -0.23, 0, -0.23, 0.23, 0.1, 0.23));
  wood.push(lathe('plinth', W, [[0, 0], [0.21, 0], [0.21, 0.04], [0.18, 0.06], [0.17, 0.16], [0.19, 0.18], [0.19, 0.2], [0, 0.2]],
    { y: 0.1, seg: 14 }));

  // feet + legs (slightly bow-legged, knees bent forward)
  for (const s of [-1, 1]) {
    wood.push(ball(`foot_${s}`, W, 0.06, s * 0.085, 0.325, 0.035, 1, 0.45, 1.6));
    wood.push(limb(`shin_${s}`, W, [s * 0.085, 0.31, 0.0], [s * 0.095, 0.48, 0.035], 0.055, 0.06));
    wood.push(limb(`thigh_${s}`, W, [s * 0.095, 0.48, 0.035], [s * 0.085, 0.65, -0.005], 0.062, 0.075));
    wood.push(ball(`knee_${s}`, W, 0.062, s * 0.095, 0.48, 0.04, 1, 1, 1));
  }

  // hips / loincloth (cawat) flap in front
  wood.push(lathe('hips', W, [[0, 0], [0.12, 0], [0.155, 0.04], [0.15, 0.1], [0, 0.1]], { y: 0.6, sz: 0.8 }));
  wood.push(boxFromMin('cawat', W, -0.06, 0.5, 0.09, 0.06, 0.66, 0.13));

  // torso: waist → belly → chest → shoulders → neck
  wood.push(lathe('torso', W, [[0, 0], [0.13, 0], [0.145, 0.06], [0.14, 0.14], [0.155, 0.24], [0.165, 0.31],
    [0.15, 0.35], [0.08, 0.38], [0, 0.38]], { y: 0.66, sz: 0.72, seg: 14 }));
  wood.push(cylinder('neck', W, 0.065, 0.08, 0, 1.04, 0, 10));

  // arms: shoulder → elbow along the body, forearms bending in so the hands meet on the belly
  for (const s of [-1, 1]) {
    wood.push(ball(`shoulder_${s}`, W, 0.07, s * 0.165, 0.95, 0, 1, 1, 0.9));
    wood.push(limb(`upperarm_${s}`, W, [s * 0.175, 0.95, 0], [s * 0.19, 0.78, 0.03], 0.058, 0.05));
    wood.push(limb(`forearm_${s}`, W, [s * 0.19, 0.78, 0.03], [s * 0.06, 0.76, 0.125], 0.05, 0.042));
    wood.push(ball(`hand_${s}`, W, 0.048, s * 0.055, 0.76, 0.13, 1, 0.8, 0.7));
  }
  dark.push(ball('navel', D, 0.014, 0, 0.84, 0.112, 1, 1, 0.5, 6));

  // head: chin → jaw → cheeks → temples → crown, a little flattened front-to-back
  const HY = 1.0;
  wood.push(lathe('head', W, [[0, 0.02], [0.075, 0.03], [0.128, 0.07], [0.155, 0.14], [0.163, 0.22], [0.158, 0.29],
    [0.14, 0.34], [0, 0.36]], { y: HY, sz: 0.88, seg: 14 }));
  const fz = 0.163 * 0.88; // face plane (front of the head)
  // heavy brow ridge
  const brow = cylinder('brow', W, 0.028, 0.25, 0, HY + 0.255, fz - 0.015, 8);
  brow.rotation.z = Math.PI / 2;
  brow.scale.set(1, 1, 0.8);
  wood.push(brow);
  // big round bulging eyes with dark pupils
  for (const s of [-1, 1]) {
    wood.push(ball(`eye_${s}`, W, 0.045, s * 0.063, HY + 0.2, fz - 0.02, 1.1, 1, 0.6, 10));
    dark.push(ball(`pupil_${s}`, D, 0.02, s * 0.063, HY + 0.2, fz + 0.002, 1, 1, 0.6, 8));
  }
  // broad nose (wedge) and wide mouth with protruding tongue
  const nose = new THREE.Mesh(meterUVs(new THREE.ConeGeometry(0.05, 0.11, 3), 0.5), W);
  nose.name = 'nose';
  nose.position.set(0, HY + 0.15, fz - 0.005);
  wood.push(nose);
  wood.push(ball('muzzle', W, 0.06, 0, HY + 0.07, fz - 0.035, 1.35, 0.6, 0.8, 10));
  dark.push(boxFromMin('mouth', D, -0.065, HY + 0.05, fz - 0.01, 0.065, HY + 0.09, fz + 0.014, 0.5));
  wood.push(ball('tongue', W, 0.024, 0, HY + 0.035, fz + 0.012, 1, 2.2, 0.6, 8));
  // ears with long earlobes and heavy rings (telinga panjang)
  for (const s of [-1, 1]) {
    wood.push(ball(`ear_${s}`, W, 0.035, s * 0.158, HY + 0.19, -0.01, 0.5, 1.2, 0.9));
    wood.push(limb(`lobe_${s}`, W, [s * 0.165, HY + 0.16, 0], [s * 0.17, HY + 0.06, 0.005], 0.016, 0.014, 6));
    const ring = new THREE.Mesh(meterUVs(new THREE.TorusGeometry(0.03, 0.01, 6, 10), 0.5), D);
    ring.name = `earring_${s}`;
    ring.position.set(s * 0.172, HY + 0.03, 0.005);
    ring.rotation.y = Math.PI / 2;
    dark.push(ring);
  }

  // headdress: carved band with a raised front plate and side horns, flaring up into the capital
  wood.push(lathe('crown', W, [[0, 0], [0.13, 0], [0.155, 0.01], [0.16, 0.05], [0.15, 0.06], [0.175, 0.1], [0.19, 0.13],
    [0, 0.13]], { y: 1.34, sz: 0.92, seg: 14 }));
  const plate = boxFromMin('crown_plate', W, -0.07, 1.34, 0.12, 0.07, 1.46, 0.165, 0.5);
  wood.push(plate);
  dark.push(disc('crown_jewel', D, 0.022, 0.012, 0, 1.4, 0.17, 8));
  for (const s of [-1, 1]) {
    wood.push(limb(`horn_${s}`, W, [s * 0.14, 1.36, 0.02], [s * 0.235, 1.455, 0.04], 0.028, 0.012, 6));
  }

  // capital: cushion + square bearing block, top face exactly at the deck underside
  wood.push(boxFromMin('capital', W, -0.24, 1.5, -0.24, 0.24, TIANG_H, 0.24));
  wood.push(boxFromMin('capital_lip', W, -0.21, 1.47, -0.21, 0.21, 1.5, 0.21));

  const body = merge('tiang_ukir_body', wood);
  const accent = merge('tiang_ukir_accent', dark);
  return group('tiang_ukir', body, accent, collider('col_tiang_ukir', -0.2, 0, -0.2, 0.2, TIANG_H, 0.2),
    anchor('anchor_ground', 0, 0, 0), anchor('anchor_top', 0, TIANG_H, 0));
}
