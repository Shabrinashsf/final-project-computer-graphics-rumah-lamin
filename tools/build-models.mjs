// Assembles the parts in parts/<area>/ (see src/assembly/manifest.json) and writes one GLB per
// area to public/model/<area>.glb — the files the app loads. Run: npm run build:models
//
// Each instance becomes a top-level node named by its id, placed in world space, with
// extras { component, placeholder }. The area of a component is the folder of its src.
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readGLB } from './lib/glb-reader.mjs';
import { mergeGLBs } from './lib/glb-merge.mjs';
import { solveAssembly } from '../src/assembly/solve.js';

const ROOT = path.resolve(import.meta.dirname, '..');
export const PARTS_DIR = path.join(ROOT, 'parts');
export const MODEL_DIR = path.join(ROOT, 'public/model');

export function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'src/assembly/manifest.json'), 'utf8'));
}

export const areaOf = (src) => src.split('/')[0];

export function buildModels(outDir = MODEL_DIR, manifest = loadManifest()) {
  const anchorsBy = {};
  for (const [name, c] of Object.entries(manifest.components)) {
    anchorsBy[name] = readGLB(path.join(PARTS_DIR, c.src)).anchors;
  }
  const { instances, errors } = solveAssembly(manifest, anchorsBy);
  if (errors.length) throw new Error(`assembly errors:\n  ${errors.join('\n  ')}`);

  const results = {};
  for (const area of manifest.areas) {
    const list = instances
      .filter((i) => areaOf(manifest.components[i.component].src) === area)
      .map((i) => ({
        id: i.id,
        file: path.join(PARTS_DIR, manifest.components[i.component].src),
        matrix: i.matrix.toArray(),
        extras: { component: i.component, placeholder: Boolean(manifest.components[i.component].placeholder) },
      }));
    results[area] = mergeGLBs(path.join(outDir, `${area}.glb`), list, `rumah-lamin build-models (${area})`);
  }
  return results;
}

// pathToFileURL: a plain `file://${argv[1]}` never matches on Windows (backslashes, drive letter).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [area, r] of Object.entries(buildModels())) {
    console.log(`public/model/${area}.glb: ${r.instances} instances, ${r.meshes} meshes, ${r.bytes} bytes`);
  }
}
