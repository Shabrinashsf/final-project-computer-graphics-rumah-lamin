// Lightweight GLB reader for Node (no textures, no geometry decode).
// Returns anchors (component-local matrices) and meshes (local matrix + POSITION bounds).
import fs from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';

export function readGLB(file) {
  const d = fs.readFileSync(file);
  if (d.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const len = d.readUInt32LE(12);
  const json = JSON.parse(d.subarray(20, 20 + len).toString('utf8'));
  const sceneNodes = json.scenes[json.scene ?? 0].nodes;
  const anchors = {};
  const meshes = [];

  function local(node) {
    if (node.matrix) return new Matrix4().fromArray(node.matrix);
    const t = new Vector3().fromArray(node.translation ?? [0, 0, 0]);
    const r = new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]);
    const s = new Vector3().fromArray(node.scale ?? [1, 1, 1]);
    return new Matrix4().compose(t, r, s);
  }

  function visit(idx, parent) {
    const node = json.nodes[idx];
    const m = parent.clone().multiply(local(node));
    const name = node.name ?? `node_${idx}`;
    if (name.startsWith('anchor_')) anchors[name] = m;
    if (node.mesh !== undefined) {
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (const p of json.meshes[node.mesh].primitives) {
        const a = json.accessors[p.attributes.POSITION];
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], a.min[k]);
          max[k] = Math.max(max[k], a.max[k]);
        }
      }
      meshes.push({ name, matrix: m, min, max });
    }
    for (const c of node.children ?? []) visit(c, m);
  }
  for (const n of sceneNodes) visit(n, new Matrix4());
  return { anchors, meshes };
}

// Reads an area model (public/model/<area>.glb): every top-level node is one instance.
// Returns [{ id, matrix (world), extras, anchors, meshes }] with anchors/meshes relative to
// the instance node, so they can be fed to checkAssembly as one component per instance.
export function readModel(file) {
  const d = fs.readFileSync(file);
  if (d.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const json = JSON.parse(d.subarray(20, 20 + d.readUInt32LE(12)).toString('utf8'));
  const out = [];
  for (const idx of json.scenes[json.scene ?? 0].nodes) {
    const top = json.nodes[idx];
    const anchors = {};
    const meshes = [];
    const visit = (i, parent) => {
      const node = json.nodes[i];
      const m = parent.clone().multiply(localMatrix(node));
      const name = node.name ?? `node_${i}`;
      if (name.startsWith('anchor_')) anchors[name] = m;
      if (node.mesh !== undefined) meshes.push({ name, matrix: m, ...meshBounds(json, node.mesh) });
      for (const c of node.children ?? []) visit(c, m);
    };
    for (const c of top.children ?? []) visit(c, new Matrix4());
    if (top.mesh !== undefined) meshes.push({ name: top.name, matrix: new Matrix4(), ...meshBounds(json, top.mesh) });
    out.push({ id: top.name ?? `node_${idx}`, matrix: localMatrix(top), extras: top.extras ?? {}, anchors, meshes });
  }
  return out;
}

function localMatrix(node) {
  if (node.matrix) return new Matrix4().fromArray(node.matrix);
  const t = new Vector3().fromArray(node.translation ?? [0, 0, 0]);
  const r = new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]);
  const s = new Vector3().fromArray(node.scale ?? [1, 1, 1]);
  return new Matrix4().compose(t, r, s);
}

function meshBounds(json, mesh) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of json.meshes[mesh].primitives) {
    const a = json.accessors[p.attributes.POSITION];
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], a.min[k]);
      max[k] = Math.max(max[k], a.max[k]);
    }
  }
  return { min, max };
}
