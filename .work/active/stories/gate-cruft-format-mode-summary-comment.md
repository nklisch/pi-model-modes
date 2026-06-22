---
id: gate-cruft-format-mode-summary-comment
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

# Remove stale mode-summary deferral comment

## Gate finding

- **Gate**: cruft
- **Release**: `v0.2.0`
- **Priority / confidence**: Low
- **Location**: `src/commands.ts`

## Resolution

Reworded the comment to state the current axes-only summary decision instead of a deferred preset-prefix task.

## Verification

- `npm run typecheck` clean.
- `npm test` passes (371/371).
