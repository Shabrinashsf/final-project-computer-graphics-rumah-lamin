// Checks the area models the app loads (public/model/<area>.glb), no browser. Run: npm run check
// Every top-level node of a model is one instance. Exit code 0 when everything passes.
// Works for models made by build-models.mjs and for GLBs exported by hand (e.g. from Blender).
import fs from 'node:fs';
import path from 'node:path';
import { readModel } from './lib/glb-reader.mjs';
import { checkAssembly } from '../src/assembly/check.js';
import { loadManifest, MODEL_DIR } from './build-models.mjs';

const MAX_OVERLAPS = 30;
const manifest = loadManifest();

let errorCount = 0;
const instances = [];
const parts = {};
const placeholder = new Map();

for (const area of manifest.areas) {
  const rel = `public/model/${area}.glb`;
  const file = path.join(MODEL_DIR, `${area}.glb`);
  if (!fs.existsSync(file)) {
    console.log(`ERROR missing model "${area}": ${rel} not found (run npm run build:models)`);
    errorCount++;
    continue;
  }
  try {
    for (const inst of readModel(file)) {
      if (parts[inst.id]) {
        console.log(`ERROR duplicate instance id "${inst.id}" in ${rel}`);
        errorCount++;
        continue;
      }
      parts[inst.id] = { anchors: inst.anchors, meshes: inst.meshes };
      instances.push({ id: inst.id, component: inst.id, matrix: inst.matrix });
      placeholder.set(inst.id, Boolean(inst.extras.placeholder));
    }
  } catch (e) {
    console.log(`ERROR cannot read model "${area}": ${rel}: ${e.message}`);
    errorCount++;
  }
}

const report = checkAssembly({ instances, parts, manifest });
// Overlap refs look like "instanceId/meshName"; instance ids never contain '/'.
const tag = (ref) => (placeholder.get(ref.slice(0, ref.indexOf('/'))) ? ' [placeholder]' : '');

console.log(`Instances: ${instances.length}`);

console.log(`Ground contact errors: ${report.groundErrors.length}`);
for (const g of report.groundErrors) {
  console.log(`  ${g.instance} ${g.anchor}: y=${g.y} (expected 0 +/- 0.01)`);
}
errorCount += report.groundErrors.length;

const overlaps = [...report.overlaps].sort((x, y) => y.depth - x.depth);
console.log(`Overlaps: ${overlaps.length}`);
for (const o of overlaps.slice(0, MAX_OVERLAPS)) {
  console.log(`  depth ${o.depth.toFixed(4)} m  ${o.a}${tag(o.a)}  <->  ${o.b}${tag(o.b)}`);
}
if (overlaps.length > MAX_OVERLAPS) console.log(`  ... and ${overlaps.length - MAX_OVERLAPS} more`);
errorCount += overlaps.length;

if (errorCount === 0) {
  console.log('CHECK PASSED');
  process.exitCode = 0;
} else {
  console.log(`CHECK FAILED (${errorCount} errors)`);
  process.exitCode = 1;
}
