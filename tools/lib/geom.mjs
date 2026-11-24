// Shared building blocks for component generators.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---- Materials (one shared instance per name; textures live in public/textures/<area>) ----
function mat(name, texture, color = 0xffffff, roughness = 0.9) {
  const m = new THREE.MeshStandardMaterial({ name, color, roughness, metalness: 0 });
  if (texture) m.userData.texture = texture;
  return m;
}

export const MAT = {
  kayuGelap: mat('Kayu_Gelap', 'eksterior/kayu_gelap.png'),
  kayuUlin: mat('Kayu_Ulin', 'eksterior/kayu_ulin.png'),
  motifGelap: mat('Motif_Gelap', 'atap/motif_gelap.png', 0xffffff, 0.8),
  motifTerang: mat('Motif_Terang', 'interior/motif_terang.png', 0xffffff, 0.8),
  tanah: mat('Tanah', 'props/tanah.png', 0xffffff, 1),
  motifUsei: mat('Motif_Usei', 'eksterior/motif_usei.jpg', 0xffffff, 0.8),   // front wall, veranda side
  motifDalam: mat('Motif_Dalam', 'interior/motif_dalam.jpg', 0xffffff, 0.8), // walls inside tilong/amin/atang
  motifPagar: mat('Motif_Pagar', 'eksterior/motif_pagar.png', 0xffffff, 0.8), // veranda railing panels
  whitebox: mat('Whitebox', null, 0xbfbfbf, 1),
  collider: mat('Collider', null, 0xff00ff, 1),
};

// ---- UVs in metres: box projection by dominant normal axis ----
// tile = metres per texture repeat; { u, v } may differ (e.g. motif bands).
// Origin is the geometry's bbox min, so bands start at their bottom edge.
export function meterUVs(geometry, tile = 1) {
  const tu = typeof tile === 'number' ? tile : tile.u;
  const tv = typeof tile === 'number' ? tile : tile.v;
  geometry.computeBoundingBox();
  const min = geometry.boundingBox.min;
  const pos = geometry.getAttribute('position');
  const nrm = geometry.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) - min.x, y = pos.getY(i) - min.y, z = pos.getZ(i) - min.z;
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
    let a, b;
    if (ay >= ax && ay >= az) { a = x; b = z; }
    else if (ax >= az) { a = z; b = y; }
    else { a = x; b = y; }
    uv[i * 2] = a / tu;
    uv[i * 2 + 1] = 1 - b / tv; // glTF v=0 is image top
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

// Box mesh positioned by its CENTRE.
export function box(name, material, w, h, d, x = 0, y = 0, z = 0, tile = 1) {
  const g = meterUVs(new THREE.BoxGeometry(w, h, d), tile);
  const m = new THREE.Mesh(g, material);
  m.name = name;
  m.position.set(x, y, z);
  return m;
}

// Box mesh positioned by its MIN corner → easier to reason about extents.
export function boxFromMin(name, material, x0, y0, z0, x1, y1, z1, tile = 1) {
  return box(name, material, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, tile);
}

export function cylinder(name, material, r, h, x = 0, y = 0, z = 0, segments = 12, tile = 1) {
  const g = meterUVs(new THREE.CylinderGeometry(r, r, h, segments), tile);
  const m = new THREE.Mesh(g, material);
  m.name = name;
  m.position.set(x, y, z);
  return m;
}

// Invisible collision box (axis-aligned in component space), defined by min/max corners.
export function collider(name, x0, y0, z0, x1, y1, z1) {
  const m = boxFromMin(name.startsWith('col_') ? name : `col_${name}`, MAT.collider, x0, y0, z0, x1, y1, z1);
  return m;
}

// Empty attachment node. rotY in degrees.
export function anchor(name, x = 0, y = 0, z = 0, rotY = 0) {
  const o = new THREE.Object3D();
  o.name = name.startsWith('anchor_') ? name : `anchor_${name}`;
  o.position.set(x, y, z);
  o.rotation.y = THREE.MathUtils.degToRad(rotY);
  return o;
}

// Merge meshes that share ONE material into a single mesh (bakes their transforms).
export function merge(name, meshes) {
  const material = meshes[0].material;
  const geos = meshes.map((m) => {
    if (m.material !== material) throw new Error(`merge(${name}): mixed materials`);
    m.updateMatrix();
    const g = m.geometry.clone().applyMatrix4(m.matrix);
    return g.index ? g.toNonIndexed() : g;
  });
  const out = new THREE.Mesh(mergeGeometries(geos), material);
  out.name = name;
  return out;
}

export function group(name, ...children) {
  const g = new THREE.Group();
  g.name = name;
  for (const c of children.flat()) g.add(c);
  return g;
}

// Flat textured panel on one face of a wall, with UVs in wall coordinates so a motif runs on
// continuously across separate pieces. axis 'z': panel in the X-Y plane at z = c, spanning
// a0..a1 along x. axis 'x': panel in the Z-Y plane at x = c, spanning a0..a1 along z.
// facing: +1 / -1 along the axis. tile: { u, v } metres per image repeat.
export function facePanel(name, material, axis, c, a0, a1, y0, y1, facing, tile) {
  const P = axis === 'z'
    ? (a, y) => [a, y, c]
    : (a, y) => [c, y, a];
  const pts = [P(a0, y0), P(a1, y0), P(a1, y1), P(a0, y1)];
  // u runs left-to-right as seen by a viewer looking at the face.
  const uSign = axis === 'z' ? facing : -facing;
  const uv = [[a0, y0], [a1, y0], [a1, y1], [a0, y1]].flatMap(([a, y]) => [(uSign * a) / tile.u, 1 - y / tile.v]);
  const normal = axis === 'z' ? [0, 0, facing] : [facing, 0, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts.flat()), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([...normal, ...normal, ...normal, ...normal]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  // pick the winding whose face normal points along `facing`
  const e1 = new THREE.Vector3(...pts[1]).sub(new THREE.Vector3(...pts[0]));
  const e2 = new THREE.Vector3(...pts[2]).sub(new THREE.Vector3(...pts[0]));
  const n = e1.cross(e2);
  const ok = (axis === 'z' ? n.z : n.x) * facing > 0;
  g.setIndex(ok ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  const m = new THREE.Mesh(g, material);
  m.name = name;
  return m;
}

// Straight beam between two points, w wide and h deep. Works for beams in the Y-Z plane
// (x0 == x1) and in the X-Y plane (z0 == z1). With `hang`, the beam hangs below the line
// (its top face lies on p0-p1), which is how rafters sit under a roof surface.
export function beam(name, material, p0, p1, w, h, hang = false) {
  const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1);
  const d = b.clone().sub(a);
  const len = d.length();
  const inYZ = Math.abs(d.x) < 1e-9;
  if (hang) {
    const n = inYZ ? new THREE.Vector3(0, -d.z, d.y) : new THREE.Vector3(-d.y, d.x, 0);
    n.normalize();
    if (n.y > 0) n.negate();
    a.addScaledVector(n, h / 2);
    b.addScaledVector(n, h / 2);
  }
  const g = inYZ ? new THREE.BoxGeometry(w, h, len) : new THREE.BoxGeometry(len, h, w);
  const m = new THREE.Mesh(meterUVs(g), material);
  m.name = name;
  m.position.copy(a).add(b).multiplyScalar(0.5);
  if (inYZ) m.rotation.x = Math.atan2(-d.y, d.z);
  else m.rotation.z = Math.atan2(d.y, d.x);
  return m;
}
