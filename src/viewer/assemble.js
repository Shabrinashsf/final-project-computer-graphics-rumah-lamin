// Loads the area models (public/model/<area>.glb). Every top-level node of a model is one
// instance; its extras ({ component, placeholder }) end up in userData via GLTFLoader.
import { Box3, Group, Matrix4 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import manifest from '../assembly/manifest.json';

// Anchors and mesh bounds of one instance, relative to the instance node.
function analyse(inst) {
  inst.updateMatrixWorld(true);
  const toLocal = new Matrix4().copy(inst.matrixWorld).invert();
  const anchors = {};
  const meshes = [];
  inst.traverse((node) => {
    if (node === inst) return;
    const m = toLocal.clone().multiply(node.matrixWorld);
    if (node.name && node.name.startsWith('anchor_')) anchors[node.name] = m;
    if (node.isMesh) {
      const g = node.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      meshes.push({ name: node.name, matrix: m, min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray() });
    }
  });
  return { anchors, meshes };
}

export async function assemble() {
  const loader = new GLTFLoader();
  const loadErrors = [];
  const root = new Group();
  root.name = 'rumah_lamin';
  const instanceGroups = [];
  const instances = [];
  const parts = {};

  const scenes = await Promise.all(
    manifest.areas.map(async (area) => {
      const src = `model/${area}.glb`;
      try {
        return { area, scene: (await loader.loadAsync(import.meta.env.BASE_URL + src)).scene };
      } catch (e) {
        loadErrors.push(`${area} (${src}): ${e?.message ?? e}`);
        return null;
      }
    }),
  );

  for (const s of scenes) {
    if (!s) continue;
    s.scene.name = s.area;
    root.add(s.scene);
    for (const inst of [...s.scene.children]) {
      inst.userData = { ...inst.userData, id: inst.name, area: s.area, placeholder: !!inst.userData.placeholder };
      instanceGroups.push(inst);
    }
  }
  root.updateMatrixWorld(true);

  for (const inst of instanceGroups) {
    parts[inst.name] = analyse(inst);
    instances.push({ id: inst.name, component: inst.name, matrix: inst.matrixWorld.clone() });
    inst.userData.component = inst.name;
  }

  // col_* meshes: hidden, world boxes collected for walking. Everything else casts/receives shadows.
  const colliders = [];
  root.traverse((n) => {
    if (!n.isMesh) return;
    if (n.name.startsWith('col_')) {
      n.visible = false;
      n.geometry.computeBoundingBox();
      colliders.push(new Box3().copy(n.geometry.boundingBox).applyMatrix4(n.matrixWorld));
    } else {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });

  return { manifest, root, instanceGroups, instances, solveErrors: [], parts, colliders, loadErrors };
}
