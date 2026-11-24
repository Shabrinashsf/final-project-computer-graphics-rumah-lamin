// Wall builder shared by the exterior and interior generators.
//
// wall(name, spec) builds one straight wall run with door/window openings:
//   axis      'z' → the wall runs along x at z = c;  'x' → it runs along z at x = c
//   c, t      centre line and thickness;  a0..a1 extent along the run;  H height
//   openings  [{ a0, a1, y0, y1 }]  (y0 = 0 → door, else window)
//   faces     [{ side: +1|-1, mat: Material | (aMid) => Material, tile: {u, v} }]
//             textured panels on each face (a few mm off the core, UVs continuous)
//   splits    extra positions along the run where the face material may change
//   frameSide +1|-1: side that gets wooden frames around the openings (null = none)
// Returns { meshes, colliders }. Windows get a solid collider (you can't walk through them).
import { MAT, boxFromMin, collider, facePanel, merge } from './geom.mjs';

const PANEL_GAP = 0.004;
const FRAME_W = 0.08;
const FRAME_D = 0.04;

export function wall(name, spec) {
  const { axis, c, t, a0, a1, H, openings = [], faces = [], splits = [], frameSide = null, core = MAT.kayuGelap } = spec;
  // Box in run coordinates (a along the run, n across it) → world min/max.
  const toBox = (aa0, aa1, y0, y1, n0, n1) => (axis === 'z' ? [aa0, y0, n0, aa1, y1, n1] : [n0, y0, aa0, n1, y1, aa1]);

  const cuts = [...new Set([a0, a1, ...splits, ...openings.flatMap((o) => [o.a0, o.a1])])]
    .filter((x) => x >= a0 && x <= a1)
    .sort((x, y) => x - y);
  const pieces = []; // { a0, a1, y0, y1 }
  for (let i = 0; i < cuts.length - 1; i++) {
    const p0 = cuts[i], p1 = cuts[i + 1];
    if (p1 - p0 < 1e-6) continue;
    const o = openings.find((op) => op.a0 <= p0 + 1e-6 && op.a1 >= p1 - 1e-6);
    if (!o) { pieces.push({ a0: p0, a1: p1, y0: 0, y1: H }); continue; }
    if (o.y0 > 0) pieces.push({ a0: p0, a1: p1, y0: 0, y1: o.y0 });
    if (o.y1 < H) pieces.push({ a0: p0, a1: p1, y0: o.y1, y1: H });
  }

  const meshes = [];
  const coreBoxes = pieces.map((p, i) => boxFromMin(`${name}_${i}`, core, ...toBox(p.a0, p.a1, p.y0, p.y1, c - t / 2, c + t / 2)));
  meshes.push(merge(name, coreBoxes));

  // Face panels, merged per (side, material).
  const bySideMat = new Map();
  for (const f of faces) {
    for (const p of pieces) {
      const mat = typeof f.mat === 'function' ? f.mat((p.a0 + p.a1) / 2) : f.mat;
      if (!mat) continue;
      const key = `${f.side}|${mat.name}`;
      if (!bySideMat.has(key)) bySideMat.set(key, []);
      bySideMat.get(key).push(facePanel('p', mat, axis, c + f.side * (t / 2 + PANEL_GAP), p.a0, p.a1, p.y0, p.y1, f.side, f.tile));
    }
  }
  for (const [key, list] of bySideMat) {
    const [side, matName] = key.split('|');
    meshes.push(merge(`${name}_${matName.toLowerCase()}_${side === '1' ? 'pos' : 'neg'}`, list));
  }

  // Frames around openings on frameSide.
  if (frameSide) {
    const n0 = c + frameSide * (t / 2), n1 = c + frameSide * (t / 2 + FRAME_D);
    const nn = [Math.min(n0, n1), Math.max(n0, n1)];
    const frames = [];
    openings.forEach((o, i) => {
      frames.push(boxFromMin(`f${i}l`, core, ...toBox(o.a0 - FRAME_W, o.a0, o.y0, o.y1 + FRAME_W, ...nn)));
      frames.push(boxFromMin(`f${i}r`, core, ...toBox(o.a1, o.a1 + FRAME_W, o.y0, o.y1 + FRAME_W, ...nn)));
      frames.push(boxFromMin(`f${i}t`, core, ...toBox(o.a0, o.a1, o.y1, o.y1 + FRAME_W, ...nn)));
      if (o.y0 > 0) frames.push(boxFromMin(`f${i}b`, core, ...toBox(o.a0 - FRAME_W, o.a1 + FRAME_W, o.y0 - FRAME_W, o.y0, ...nn)));
    });
    if (frames.length) meshes.push(merge(`${name}_kusen`, frames));
  }

  // Colliders: every core piece, plus the window openings themselves.
  const colliders = pieces.map((p, i) => collider(`col_${name}_${i}`, ...toBox(p.a0, p.a1, p.y0, p.y1, c - t / 2, c + t / 2)));
  openings.filter((o) => o.y0 > 0).forEach((o, i) => {
    colliders.push(collider(`col_${name}_jendela_${i}`, ...toBox(o.a0, o.a1, o.y0, o.y1, c - t / 2, c + t / 2)));
  });
  return { meshes, colliders };
}
