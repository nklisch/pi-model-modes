---
id: gate-cruft-preset-file-dead-type
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

# Remove dead PresetFile export

## Gate finding

- **Gate**: cruft
- **Release**: `v0.2.0`
- **Priority / confidence**: High
- **Location**: `src/presets.ts`

## Resolution

Removed the unused exported `PresetFile` alias; `PresetRegistry` remains the in-memory shape.

## Verification

- `npm run typecheck` clean.
- `npm test` passes (371/371).
