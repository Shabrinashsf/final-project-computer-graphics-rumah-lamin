// The area models in public/model/ are built from parts/ and must stay in sync and pass the check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildModels, loadManifest, MODEL_DIR, areaOf } from '../tools/build-models.mjs';
import { readModel } from '../tools/lib/glb-reader.mjs';
import { checkAssembly } from '../src/assembly/check.js';

const manifest = loadManifest();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'models-'));
buildModels(tmp, manifest);

const EXPECTED = {
  eksterior: ['lantai', 'dinding_luar', 'pagar', 'tiang_usei', 'tangga_kiri', 'tangga_kanan'],
  interior: ['dinding_dalam', 'tiang_dalam', 'rangka'],
  atap: ['atap', 'atap_atang', 'atap_usei_kiri', 'atap_usei_tengah', 'atap_usei_kanan'],
  props: ['tanah'],
};

test('models: one model per area, matching the team split', () => {
  assert.deepEqual(manifest.areas, ['eksterior', 'interior', 'atap', 'props']);
  for (const c of Object.values(manifest.components)) assert.ok(manifest.areas.includes(areaOf(c.src)), c.src);
});

for (const area of Object.keys(EXPECTED)) {
  test(`models: ${area}.glb holds the expected instances`, () => {
    const ids = readModel(path.join(tmp, `${area}.glb`)).map((i) => i.id);
    for (const id of EXPECTED[area]) assert.ok(ids.includes(id), `${area} missing ${id}`);
    if (area === 'eksterior') assert.equal(ids.filter((i) => /^tiang_\d+$/.test(i)).length, 84);
  });

  test(`models: public/model/${area}.glb is up to date (run npm run build:models)`, () => {
    const committed = path.join(MODEL_DIR, `${area}.glb`);
    assert.ok(fs.existsSync(committed), `${committed} missing`);
    assert.ok(fs.readFileSync(committed).equals(fs.readFileSync(path.join(tmp, `${area}.glb`))), `${area}.glb is stale`);
  });
}

test('models: all areas together pass the assembly check', () => {
  const instances = [];
  const parts = {};
  for (const area of manifest.areas) {
    for (const i of readModel(path.join(tmp, `${area}.glb`))) {
      parts[i.id] = i;
      instances.push({ id: i.id, component: i.id, matrix: i.matrix });
    }
  }
  assert.equal(instances.length, 99);
  const r = checkAssembly({ instances, parts, manifest });
  assert.deepEqual(r.groundErrors, []);
  assert.deepEqual(r.overlaps, []);
});

test('hotspots: every data/hotspot-<area>.json is valid', () => {
  for (const area of manifest.areas) {
    const data = JSON.parse(fs.readFileSync(new URL(`../public/data/hotspot-${area}.json`, import.meta.url)));
    assert.equal(data.area, area);
    assert.ok(Array.isArray(data.hotspots));
    for (const h of data.hotspots) {
      assert.equal(typeof h.id, 'string');
      assert.equal(typeof h.title, 'string');
      assert.ok(Array.isArray(h.position) && h.position.length === 3 && h.position.every(Number.isFinite), `${h.id} position`);
    }
  }
});
