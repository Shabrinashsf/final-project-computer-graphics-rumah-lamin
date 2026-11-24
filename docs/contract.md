# Component Contract — Rumah Lamin

Every part of the house is a separate GLB **component**. Components are assembled at
runtime by snapping **anchors** together, as described in `src/assembly/manifest.json`.
Anyone can replace a component (for example, swap a placeholder for a real model made in
Blender) as long as it follows this contract.

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

## 2. Component files

| Component | File | Owner | Status |
|---|---|---|---|
| tanah (ground) | `public/components/exterior/tanah.glb` | exterior | real |
| lantai (deck slab) | `public/components/exterior/lantai.glb` | exterior | real |
| tiang (pillar) | `public/components/exterior/tiang.glb` | exterior | real |
| dinding (walls + doors) | `public/components/exterior/dinding.glb` | exterior | real |
| pagar (veranda railing + side rails + roof posts) | `public/components/exterior/pagar.glb` | exterior | real |
| tangga (staircase) | `public/components/exterior/tangga.glb` | exterior | real |
| atap (main roof) | `public/components/placeholder/atap.glb` | teammate | whitebox |
| atap_atang (rear annex roof) | `public/components/placeholder/atap_atang.glb` | teammate | whitebox |
| atap_usei (veranda lean-to roof) | `public/components/placeholder/atap_usei.glb` | teammate | whitebox |

The exterior GLBs are the source of truth. `dinding.glb` was edited after delivery: the centre
window was removed and all walls raised from 3.0 m to 4.5 m. `tools/build-exterior.mjs` still produces the
old layout and is not part of `npm run gen`; `npm run gen` only rebuilds the placeholders.

To replace a placeholder, drop the real GLB in and change its path in the manifest. The
replacement must have the same anchor names and stay inside the same bounding box (±5 cm).

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

Anchors are matched by exact name. A wildcard such as `anchor_tiang_*` in the manifest
creates one instance per matching anchor.

## 4. Anchors per component

All coordinates are in the component's own local space.

| Component | Local origin | Anchors |
|---|---|---|
| tanah | world origin | `anchor_house` (0, 0, 0) |
| lantai | floor-top centre, front wall line | `anchor_base` (0, -1.8, 0) · `anchor_tiang_00…83` pillar tops at y = -0.2 (13 × 6 grid at x = -15 … 15 step 2.5, z = -10, -5, 0, 2.5, 5, 6.8, plus atang 3 × 2 at x = -2.5, 0, 2.5, z = -12.5, -15) · `anchor_dinding` (0, 0, 0) · `anchor_pagar` (0, 0, 7) · `anchor_interior` (0, 0, 0) · `anchor_tangga_kiri` (-13.75, 0, 7) · `anchor_tangga_kanan` (13.75, 0, 7) |
| tiang | bottom centre | `anchor_ground` (0, 0, 0) · `anchor_top` (0, 1.6, 0) |
| dinding | base centre of the front wall (floor top) | `anchor_base` (0, 0, 0) · `anchor_atap` (0, 4.5, 0) · `anchor_atap_atang_0` (0, 4.5, -12.5) |
| pagar | front-edge base centre | `anchor_base` (0, 0, 0) · `anchor_atap_usei` (0, 2.3, 0) top of the roof posts |
| tangga | top landing, front edge of deck | `anchor_top` (0, 0, 0) · `anchor_ground` (0, -1.8, 3.17) foot of stair · `anchor_patung_kiri` / `anchor_patung_kanan` (∓1.8, -1.8, 2.57) |
| atap | front wall-top centre | `anchor_base` (0, 0, 0) |
| atap_atang | atang wall-top centre | `anchor_base` (0, 0, 0) |
| atap_usei | top of the veranda roof posts, front centre | `anchor_base` (0, 0, 0) |

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
| Walls (outer) | x ±15.06, y 1.8 … 6.3 (4.5 m high), z -10.06 … 0.1; atang x ±2.56, z -15.06 … -10.06 |
| Partitions | `dinding_sekat` at x = ±7 (z -10 … 0), each with a 0.85 m opening at z = -5 |
| Openings | doors at x = ±6 in the front wall (0.85 wide × 1.8 high); no window; doorway x = 0 into the atang |
| Veranda | z 0 … 7, railing along z ≈ 6.9 with 1.75 m gaps at x = ±13.75; side rails at x = ±15.1; roof posts top at y 4.1 |
| Stairs | 1.4 wide, at x = ±13.75, from deck edge z = 7 out to z ≈ 10.2, top at y 1.8, foot at y 0. Handrail posts are sunk into the ground/deck (allowed overlap) |
| Roofs (placeholder) | atap x ±15.9, y 6.3 … 9.45, z -10.8 … 0.3; atap_atang x ±3.2, y 6.3 … 8.5, z -15.7 … -10; atap_usei (gable, ridge along x at z 3.75) x ±15.5, y 4.1 … 6.0, z 0.1 … 7.4 |

Doorways are exactly 1.8 m high, so the walking player is 1.7 m tall (eye 1.6 m).

## 6. Verification

`npm run check` assembles the manifest without a browser and reports:

1. **Missing anchors** — an attachment that refers to an anchor that does not exist.
2. **Ground contact** — every `anchor_ground*` must land at world y = 0 ± 0.01.
3. **Overlaps** — visible meshes from *different* instances whose bounding boxes
   interpenetrate by more than 0.01 m. Intentional overlaps go in `allowOverlap` in the
   manifest.

The viewer shows the same report in its panel.
