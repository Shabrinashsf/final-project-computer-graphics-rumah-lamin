# Progress

Last updated: 2026-11-25. Status per area; see [contract.md](contract.md) for the rules every
part follows.

## Overall

- 103 instances assemble with no ground-contact errors and no overlaps (`npm run check`).
- 103 tests pass (`npm test`).
- The viewer runs with orbit and walk mode, a debug panel and hotspots.

## Exterior & kolong (Ican)

Done:

- Deck slab with 84 pillar anchors, outer walls with doors and windows, usei railing with motif
  panels, 13 usei posts.
- Every exterior part is now generated from source (`tools/generate/eksterior*.mjs`). Before
  this, `tiang` and `tangga` existed only as binary files.
- **Carved figure pillars** (`tiang_ukir`, reference image 6) on the front row: 13 guardian
  figures (pedestal, legs, torso with hands on the belly, a large head with a carved face,
  long earlobes, headdress, capital). The other 71 pillars stay plain.
- **Log stairs** (`tangga`, reference image 13) at x = ±6.25: two round log stringers,
  thick treads seated on them, round-pole handrails. Walking colliders are unchanged.

Next:

1. Kolong structure: main beams on the pillar rows and floor joists under the deck; a darker
   kolong (ambient occlusion). Ground and lighting need agreement with Najib and Shab.
2. Wood refinement: normal/roughness maps, sharper motif textures, door leaves.
3. Exterior hotspots: replace the sample text with 4–5 real entries (log stairs, carved
   pillars, usei, wall motif, purpose of the kolong).
4. Open question for the team: who owns the front sign (plang, reference images 1–2)?

## Interior & app foundation (Shab)

Inner walls, interior posts and the full roof frame (rangka) are generated; the viewer,
hotspots and per-area model build are in place.

## Roof & ornaments (Aqil)

Whitebox placeholders for all five roofs (main, atang, three usei roofs) sit on the roof frame.
The real roofs and ornaments are still to come.

## Statues, props & environment (Najib)

The ground is delivered. Four whitebox statue placeholders stand beside the two stairs
(`parts/props/patung.glb`); the real Blontang statues, environment and audio are still to come.
