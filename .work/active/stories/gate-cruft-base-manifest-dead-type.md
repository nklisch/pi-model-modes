---
id: gate-cruft-base-manifest-dead-type
kind: story
stage: done
tags: [cleanup]
parent: null
depends_on: []
release_binding: v0.2.0
gate_origin: cruft
created: 2026-06-22
updated: 2026-06-22
---

# Remove dead BaseManifest export

## Gate finding

- **Gate**: cruft
- **Release**: `v0.2.0`
- **Priority / confidence**: High
- **Location**: `src/fragments.ts`

## Resolution

Removed the unused exported `BaseManifest` interface; the manifest shape remains documented at `discoverBaseOverlays`.

## Verification

- `npm run typecheck` clean.
- `npm test` passes (371/371).
