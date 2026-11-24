// Merges several GLB files into one. Each instance becomes a top-level node (named by its id,
// with a world matrix and `extras`) holding a copy of its source file's scene nodes. Meshes,
// materials and textures of a source file are stored once and shared by all its instances.
import fs from 'node:fs';
import path from 'node:path';

function parseGLB(file) {
  const d = fs.readFileSync(file);
  if (d.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const jsonLen = d.readUInt32LE(12);
  const json = JSON.parse(d.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen;
  const bin = binStart < d.length ? d.subarray(binStart + 8, binStart + 8 + d.readUInt32LE(binStart)) : Buffer.alloc(0);
  return { json, bin };
}

// instances: [{ id, file, matrix: number[16] (column-major), extras?: object }]
export function mergeGLBs(outPath, instances, generator = 'rumah-lamin glb-merge') {
  const out = {
    asset: { version: '2.0', generator },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [],
    images: [], textures: [], samplers: [], buffers: [],
  };
  const bins = [];
  let binLength = 0;
  const sources = new Map(); // file -> { json, offsets }

  function addSource(file) {
    if (sources.has(file)) return sources.get(file);
    const { json, bin } = parseGLB(file);
    const pad = (4 - (binLength % 4)) % 4;
    if (pad) { bins.push(Buffer.alloc(pad)); binLength += pad; }
    const base = binLength;
    bins.push(bin);
    binLength += bin.length;

    const o = {
      bufferView: out.bufferViews.length, accessor: out.accessors.length, image: out.images.length,
      sampler: out.samplers.length, texture: out.textures.length, material: out.materials.length,
      mesh: out.meshes.length,
    };
    for (const v of json.bufferViews ?? []) out.bufferViews.push({ ...v, buffer: 0, byteOffset: (v.byteOffset ?? 0) + base });
    for (const a of json.accessors ?? []) out.accessors.push({ ...a, bufferView: a.bufferView + o.bufferView });
    for (const im of json.images ?? []) out.images.push({ ...im, bufferView: im.bufferView + o.bufferView });
    for (const s of json.samplers ?? []) out.samplers.push(s);
    for (const t of json.textures ?? []) {
      out.textures.push({ ...t, source: t.source + o.image, ...(t.sampler !== undefined && { sampler: t.sampler + o.sampler }) });
    }
    for (const m of json.materials ?? []) {
      const c = structuredClone(m);
      const tex = c.pbrMetallicRoughness?.baseColorTexture;
      if (tex) tex.index += o.texture;
      for (const k of ['normalTexture', 'occlusionTexture', 'emissiveTexture']) if (c[k]) c[k].index += o.texture;
      const mr = c.pbrMetallicRoughness?.metallicRoughnessTexture;
      if (mr) mr.index += o.texture;
      out.materials.push(c);
    }
    for (const m of json.meshes ?? []) {
      out.meshes.push({
        ...m,
        primitives: m.primitives.map((p) => {
          const q = { ...p, attributes: Object.fromEntries(Object.entries(p.attributes).map(([k, v]) => [k, v + o.accessor])) };
          if (p.indices !== undefined) q.indices = p.indices + o.accessor;
          if (p.material !== undefined) q.material = p.material + o.material;
          return q;
        }),
      });
    }
    const src = { json, o };
    sources.set(file, src);
    return src;
  }

  function copyNode({ json, o }, idx) {
    const n = json.nodes[idx];
    const c = { ...n };
    delete c.children;
    if (n.mesh !== undefined) c.mesh = n.mesh + o.mesh;
    const i = out.nodes.push(c) - 1;
    if (n.children?.length) c.children = n.children.map((k) => copyNode({ json, o }, k));
    return i;
  }

  for (const inst of instances) {
    const src = addSource(inst.file);
    const roots = src.json.scenes[src.json.scene ?? 0].nodes;
    const top = { name: inst.id, matrix: inst.matrix };
    if (inst.extras) top.extras = inst.extras;
    const i = out.nodes.push(top) - 1;
    top.children = roots.map((r) => copyNode(src, r));
    out.scenes[0].nodes.push(i);
  }

  for (const k of ['images', 'textures', 'samplers', 'materials']) if (!out[k].length) delete out[k];
  const bin = Buffer.concat([...bins, Buffer.alloc((4 - (binLength % 4)) % 4)]);
  out.buffers.push({ byteLength: bin.length });

  let jsonBytes = Buffer.from(JSON.stringify(out));
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBytes.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonBytes.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const all = Buffer.concat([header, jh, jsonBytes, bh, bin]);
  fs.writeFileSync(outPath, all);
  return { instances: instances.length, nodes: out.nodes.length, meshes: out.meshes.length, bytes: all.length };
}
