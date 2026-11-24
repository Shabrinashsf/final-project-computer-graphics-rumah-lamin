// Hotspots: public/data/hotspot-<area>.json → clickable markers.
// File format: { "area": "<area>", "hotspots": [{ "id", "title", "description", "position": [x, y, z] }] }
// Positions are world coordinates in metres (same space as the models).
import { Group, Mesh, MeshBasicMaterial, Raycaster, SphereGeometry, Vector2 } from 'three';

const COLORS = { eksterior: 0x38bdf8, interior: 0xfacc15, atap: 0xf472b6, props: 0x4ade80 };

export async function loadHotspots(areas) {
  const errors = [];
  const lists = await Promise.all(
    areas.map(async (area) => {
      const src = `data/hotspot-${area}.json`;
      try {
        const res = await fetch(import.meta.env.BASE_URL + src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return (data.hotspots ?? []).map((h) => ({ ...h, area }));
      } catch (e) {
        errors.push(`${src}: ${e?.message ?? e}`);
        return [];
      }
    }),
  );
  return { hotspots: lists.flat(), errors };
}

export function makeHotspotMarkers(hotspots) {
  const group = new Group();
  group.name = 'hotspots';
  const geo = new SphereGeometry(0.25, 16, 12);
  for (const h of hotspots) {
    if (!Array.isArray(h.position) || h.position.length !== 3) continue;
    const mat = new MeshBasicMaterial({ color: COLORS[h.area] ?? 0xffffff, depthTest: false, transparent: true, opacity: 0.9 });
    const m = new Mesh(geo, mat);
    m.position.fromArray(h.position);
    m.renderOrder = 10;
    m.userData.hotspot = h;
    group.add(m);
  }
  return group;
}

// Returns the hotspot under the pointer (or null).
export function pickHotspot(event, canvas, camera, group) {
  const r = canvas.getBoundingClientRect();
  const ndc = new Vector2(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
  const ray = new Raycaster();
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(group.children, false)[0];
  return hit ? hit.object.userData.hotspot : null;
}
