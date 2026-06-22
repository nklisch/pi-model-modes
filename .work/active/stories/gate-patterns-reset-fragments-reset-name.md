---
id: gate-patterns-reset-fragments-reset-name
kind: story
stage: done
tags: [patterns, refactor]
parent: null
depends_on: []
release_binding: v0.2.0
gate_origin: patterns
created: 2026-06-22
updated: 2026-06-22
---

# Align fragment reset seam with resetForTesting pattern

## Gate finding

The patterns gate found one minor naming inconsistency: the fragments module used
`resetFragmentCacheForTesting`, while the newly codified pattern is module-level
`resetXForTesting` naming for stateful module resets.

## Resolution

Renamed the test-only seam to `resetFragmentsForTesting` and updated all tests.
No runtime behavior changed.

## Verification

- `npm run typecheck` clean.
- `npm test` passes (371/371).
