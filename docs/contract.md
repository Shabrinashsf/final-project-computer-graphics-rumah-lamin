# Component Contract — Rumah Lamin

The house is split into four areas (eksterior, interior, atap, props), one per team member.
The app loads one GLB per area from `public/model/`. Those models are built from smaller
**parts** in `parts/<area>/`, snapped together by **anchors** as described in
`src/assembly/manifest.json`. Anyone can replace a part (for example, swap a placeholder for
a real model made in Blender) as long as it follows this contract.

## 1. Units and axes

| Rule | Value |
|---|---|
| Unit | 1 unit = 1 metre |
| Up | +Y |
| Front of house | +Z (the stairs and veranda face +Z) |
| Long axis | X (house spans x = -15.2 … +15.2) |
| Ground level | world y = 0 |
| Floor top (house deck) | world y = 1.8 |

Blender users: export glTF with "+Y Up" enabled (the default).

## 2. Team split and files

The app loads **one model per area**. Each area has its own folders:

| Name | Area | Model the app loads | Parts (sources) | Textures | Hotspots |
|---|---|---|---|---|---|
| Shab | Interior & app foundation | `public/model/interior.glb` | `parts/interior/` | `public/textures/interior/` | `public/data/hotspot-interior.json` |
| Ican | Exterior & kolong | `public/model/eksterior.glb` | `parts/eksterior/` | `public/textures/eksterior/` | `public/data/hotspot-eksterior.json` |
| Aqil | Roof & ornaments | `public/model/atap.glb` | `parts/atap/` | `public/textures/atap/` | `public/data/hotspot-atap.json` |
| Najib | Statues, props & environment | `public/model/props.glb` | `parts/props/` | `public/textures/props/` | `public/data/hotspot-props.json` (+ `public/audio/`) |

Parts per area (`src/assembly/manifest.json`):

| Area | Part | File | Made by |
|---|---|---|---|
| eksterior | lantai (deck slab, anchors) | `parts/eksterior/lantai.glb` | `npm run gen:eksterior` |
| eksterior | tiang (pillar, ×84) | `parts/eksterior/tiang.glb` | delivered model |
| eksterior | dinding_luar (outer walls, doors, windows) | `parts/eksterior/dinding_luar.glb` | `npm run gen:eksterior` |
| eksterior | pagar (usei railing) | `parts/eksterior/pagar.glb` | `npm run gen:eksterior` |
| eksterior | tiang_usei (13 round usei posts) | `parts/eksterior/tiang_usei.glb` | `npm run gen:eksterior` |
| eksterior | tangga (staircase, ×2) | `parts/eksterior/tangga.glb` | delivered model |
| interior | dinding_dalam (inner walls at x = ±7) | `parts/interior/dinding_dalam.glb` | `npm run gen:interior` |
| interior | tiang_dalam (6 round posts carrying the frame) | `parts/interior/tiang_dalam.glb` | `npm run gen:interior` |
| interior | rangka (roof frames: main, atang, usei) | `parts/interior/rangka.glb` | `npm run gen:interior` |
| atap | atap (main roof) | `parts/atap/atap.glb` | whitebox placeholder |
| atap | atap_atang (rear annex roof) | `parts/atap/atap_atang.glb` | whitebox placeholder |
| atap | atap_usei_sisi (usei roof kiri / kanan, used twice) | `parts/atap/atap_usei_sisi.glb` | whitebox placeholder |
| atap | atap_usei_tengah (raised usei roof over the tilong) | `parts/atap/atap_usei_tengah.glb` | whitebox placeholder |
| props | tanah (ground) | `parts/props/tanah.glb` | delivered model |
| props | patung (Blontang statue, ×4: both sides of each stair) | `parts/props/patung.glb` | whitebox placeholder |

`npm run build:models` snaps the parts together with their anchors and writes
`public/model/<area>.glb`. Every instance becomes one top-level node, named by its id (for
example `tangga_kiri`, `tiang_07`), already in world space.

Two ways to deliver an area:

1. **As parts**: drop a GLB in `parts/<area>/`, add it to the manifest, run `npm run gen`.
   The part must keep the anchor names and stay inside the same bounding box (±5 cm).
2. **As one finished model**: export straight to `public/model/<area>.glb` (world space,
   +Y up, metres). Put each logical piece in its own top-level node; overlaps inside one
   top-level node are not checked. Remove that area's parts from the manifest, or the next
   `npm run build:models` overwrites your file.

`npm run gen` regenerates every generated part (exterior, interior, roof and statue placeholders) and then
the four models. `tiang.glb`, `tangga.glb` and `tanah.glb` are delivered models and are never
overwritten. `tools/legacy/exterior-v1.mjs` is the generator of the very first layout
and is kept for reference only.

### Textures

| Texture | Used on |
|---|---|
| `eksterior/motif_usei.jpg` | front wall, the side that faces the usei (veranda) |
| `interior/motif_dalam.jpg` | every wall face inside the house (tilong, amin, atang), both sides of the inner walls, post brackets |
| `eksterior/motif_pagar.png` | usei railing panels |
| `eksterior/kayu_gelap.png` | wall cores, outside faces of side/back walls, frames, railing wood, roof frame |
| `eksterior/kayu_ulin.png` | deck, interior posts |

### Roof frame (for the atap team)

The roofs rest on `rangka` (interior area). It sits on the wall tops and on the round posts
(`tiang_dalam` inside, `tiang_usei` along the front of the usei), all at world y 5.3. Each frame
has wall plates, tie beams, trusses every 2.5 m (principal rafters, king post, struts, double
collar ties), a longitudinal beam with wind braces, three purlins per slope, a ridge beam and
common rafters (kasau) every 0.625 m.

The usei roof is three gables in a `_ - _` layout: kiri and kanan at the same level as the
main roof, tengah (over the tilong, x ±7.5) 0.5 m higher on short posts.

In rangka-local coordinates (origin = front wall top centre, world (0, 5.3, 0)):

| Roof | Anchor | Underside the roof must follow |
|---|---|---|
| atap | `anchor_atap` (0, 0.2, 0) | gable along x, x ±15.8; eaves at z +0.5 and -10.5 (y 0 at the anchor); ridge at z -5, 3.0 m up |
| atap_atang | `anchor_atap_atang` (0, 0.2, -12.5) | gable along z, z -3.2 … +2.5 around the anchor; eaves at x ±3.2; ridge at x 0, 2.2 m up |
| atap_usei_kiri / _kanan | `anchor_atap_usei_kiri` / `_kanan` (∓11.425, 0.2, 0.1) | gable along x, x ±3.925 around the anchor (-15.35 … -7.5 / 7.5 … 15.35); back eave at the anchor (z 0), front eave z +7.3; ridge at z +3.65, 2.0 m up |
| atap_usei_tengah | `anchor_atap_usei_tengah` (0, 0.7, 0.1) | same profile, x ±7.8 |

All frame members stay under those surfaces, so a roof that follows them touches the frame
without cutting it. Roof-vs-frame contact is listed in `allowOverlap` (bounding boxes of sloped
pieces always intersect).

## 2b. Hotspots

`public/data/hotspot-<area>.json`:

```json
{
  "area": "eksterior",
  "hotspots": [
    { "id": "tangga-kiri", "title": "Tangga kiri", "description": "…", "position": [-6.25, 1.2, 9.2] }
  ]
}
```

`position` is in world metres. The viewer shows each hotspot as a coloured marker (one colour
per area); click it in orbit mode to read the text.

## 3. Node naming

| Prefix | Meaning |
|---|---|
| `anchor_*` | Empty node. Its position + rotation is an attachment point. |
| `anchor_ground*` | Anchor that must end up exactly on the ground (world y = 0 ± 1 cm). Checked automatically. |
| `col_*` | Invisible collision box (axis-aligned box mesh). Hidden by the viewer, used for walking. |
| anything else | Visible mesh. |

The overlap check works on each mesh's bounding box. Never merge parts that enclose a
space (for example all four walls) into one mesh: its box would swallow everything inside
and report false overlaps. One mesh per wall, rail or panel run.

Anchors are matched by exact name. Anchor and collider names survive into the area models. A wildcard such as `anchor_tiang_*` in the manifest
creates one instance per matching anchor.

## 4. Anchors per component

All coordinates are in the component's own local space.

| Component | Local origin | Anchors |
|---|---|---|
| tanah | world origin | `anchor_house` (0, 0, 0) |
| lantai | floor-top centre, front wall line | `anchor_base` (0, -1.8, 0) · `anchor_tiang_00…83` pillar tops at y = -0.2 (13 × 6 grid at x = -15 … 15 step 2.5, z = -10, -5, 0, 2.5, 5, 6.8, plus atang 3 × 2 at x = -2.5, 0, 2.5, z = -12.5, -15) · `anchor_dinding` (0, 0, 0) · `anchor_pagar` (0, 0, 7) · `anchor_interior` (0, 0, 0) · `anchor_tangga_kiri` (-6.25, 0, 7) · `anchor_tangga_kanan` (6.25, 0, 7) |
| tiang | bottom centre | `anchor_ground` (0, 0, 0) · `anchor_top` (0, 1.6, 0) |
| dinding_luar | base centre of the front wall (floor top) | `anchor_base` (0, 0, 0) · `anchor_rangka` (0, 3.5, 0) wall top |
| pagar | front-edge base centre | `anchor_base` (0, 0, 0) |
| tiang_usei | same as pagar | `anchor_base` (0, 0, 0) |
| tangga | top landing, front edge of deck | `anchor_top` (0, 0, 0) · `anchor_ground` (0, -1.8, 3.17) foot of stair · `anchor_patung_kiri` / `anchor_patung_kanan` (∓1.8, -1.8, 2.57) |
| rangka | front wall-top centre | `anchor_base` (0, 0, 0) · `anchor_atap` (0, 0.2, 0) · `anchor_atap_atang` (0, 0.2, -12.5) · `anchor_atap_usei_kiri` (-11.425, 0.2, 0.1) · `anchor_atap_usei_tengah` (0, 0.7, 0.1) · `anchor_atap_usei_kanan` (11.425, 0.2, 0.1) |
| atap | main roof eave line centre | `anchor_base` (0, 0, 0) |
| atap_atang | atang roof centre | `anchor_base` (0, 0, 0) |
| atap_usei_sisi / atap_usei_tengah | back eave centre | `anchor_base` (0, 0, 0) |
| patung | bottom centre | `anchor_ground` (0, 0, 0) |
| dinding_dalam | same as dinding_luar | `anchor_base` (0, 0, 0) |
| tiang_dalam | floor-top centre | `anchor_base` (0, 0, 0) |

A child is placed so that its anchor coincides exactly (position and rotation) with the
parent's anchor:

```
childWorld = parentWorld × parentAnchor × rotY(attach.rotationY) × inverse(childAnchor)
```

## 5. Key dimensions (world space)

| Part | Extent |
|---|---|
| Deck slab | x ±15.2, y 1.6 … 1.8, z -10.2 … 7.0; atang deck x ±2.7, z -15.2 … -10.2 |
| Pillars | 84, from y 0 to 1.6 |
| Walls (outer) | x ±15.06 (window frames to ±15.1), y 1.8 … 5.3 (3.5 m high), z -10.06 … 0.1; atang x ±2.56, z -15.06 … -10.06 |
| Inner walls | `dinding_dalam` at x = ±7 (z -10 … 0, y 1.8 … 5.3), each with a 0.85 m opening at z = -5 |
| Openings | doors at x = ±6.25 in the front wall (0.85 × 1.8); windows 0.8 × 1.2 (y 2.7 … 3.9) in the right wall at z = -2.5, -7.5 and the back wall at x = ±4.75, ±11; doorway x = 0 into the atang |
| Interior posts | 6 round, Ø 0.26 m, at z = -5, x = ±2.5, ±10, ±12.5, y 1.8 … 5.3, with carved brackets |
| Roof frame | wall plates y 5.3 … 5.5; trusses every 2.5 m; kasau every 0.625 m; main ridge at z -5, atang ridge along z, usei ridges at z 3.85; usei tengah frame raised 0.5 m |
| Usei (veranda) | z 0 … 7, railing (y 1.8 … 2.94) along z ≈ 6.9 with 1.75 m gaps at x = ±6.25; side rails at x = ±15.1; 13 round posts (Ø 0.24 m) every 2.5 m at z 6.7, y 1.8 … 5.3 |
| Stairs | 1.4 wide, at x = ±6.25 (midway between deck pillars, in front of the doors), from deck edge z = 7 out to z ≈ 10.2, top at y 1.8, foot at y 0. Handrail posts are sunk into the ground/deck (allowed overlap) |
| Statues (placeholder) | 0.7 × 5.3 × 0.7, on the ground beside each stair at x = -8.05, -4.45, 4.45, 8.05, centred on z 9.57 |
| Roofs (placeholder) | atap x ±15.9, y 5.5 … 8.65, z -10.5 … 0.5; atap_atang x ±3.2, y 5.5 … 7.7, z -15.7 … -10; atap_usei kiri/kanan x -15.35 … -7.5 / 7.5 … 15.35, y 5.5 … 7.6; tengah x ±7.8, y 6.0 … 8.1; usei z 0.1 … 7.4 |

Doorways are exactly 1.8 m high, so the walking player is 1.7 m tall (eye 1.6 m).

## 6. Verification

`npm run check` reads the four area models in `public/model/` (what the app loads) without a
browser and reports:

1. **Missing models** — an area in the manifest without `public/model/<area>.glb`.
2. **Ground contact** — every `anchor_ground*` must land at world y = 0 ± 0.01.
3. **Overlaps** — visible meshes from *different* top-level nodes whose bounding boxes
   interpenetrate by more than 0.01 m. Intentional overlaps go in `allowOverlap` in the
   manifest (patterns match top-level node names).

`npm test` also checks the parts against this contract and that `public/model/` is up to date
with `parts/`. The viewer shows the same report in its panel.
