# Rumah Lamin — Computer Graphics Final Project

A Three.js scene of a Dayak Rumah Lamin (long house on stilts). The house is built from
separate parts that snap together at named anchor points, so each team member can work on
their own area and check that it fits.

## Getting started

```bash
npm install
npm run dev        # open the viewer
```

In the viewer: drag to orbit, press **F** to walk (click to lock the mouse, WASD to move,
Shift to run, Space to jump). The panel toggles placeholders, colliders and anchors and
shows the assembly check.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the viewer (Vite) |
| `npm run build` | Production build into `dist/` |
| `npm run gen` | Regenerate all generated parts, then rebuild the area models |
| `npm run gen:eksterior` / `gen:interior` / `gen:placeholder` | Regenerate one group of parts |
| `npm run build:models` | Snap the parts together and write `public/model/<area>.glb` |
| `npm run check` | Check the area models: ground contact and overlaps |
| `npm test` | Unit and integration tests |

After changing anything in `parts/` or `tools/generate/`, run `npm run gen` (or
`npm run build:models`) and commit the updated `public/model/` files; `npm test` fails if
they are stale.

## Team split

| Member | Area |
|---|---|
| Shab | Interior & app foundation |
| Ican | Exterior & kolong |
| Aqil | Roof & ornaments |
| Najib | Statues, props & environment |

The rules every part must follow (units, axes, anchor names, dimensions) are in
[docs/contract.md](docs/contract.md).

## Folder structure

```
docs/
  contract.md              component contract: the rules for every part
  design/                  design reference (photos of the real Lamin)
parts/<area>/              source parts per area, snapped together by anchors
public/
  model/<area>.glb         assembled area models the app loads (generated)
  textures/<area>/         textures, grouped by area
  data/hotspot-<area>.json hotspot text per area
  audio/                   sound (props area)
resource/
  eksterior.glb            exterior model the current parts were taken from
  original/                first-iteration blockout models (old layout, reference only)
src/
  main.js, style.css       viewer entry
  assembly/                manifest, anchor solver, assembly check (shared with Node)
  viewer/                  loading, debug helpers, hotspots, check report
  walk/                    first-person walking physics
tests/                     node:test suites
tools/
  generate/                part generators (eksterior, interior, placeholders)
  lib/                     GLB writer/reader/merge and geometry helpers
  legacy/                  generator of the first layout (reference only)
  build-models.mjs         parts -> public/model/<area>.glb
  check.mjs                assembly check CLI
```
