---
id: gate-patterns-v0.2.0
kind: story
stage: done
tags: [patterns]
parent: null
depends_on: []
release_binding: v0.2.0
gate_origin: patterns
created: 2026-06-22
updated: 2026-06-22
---

# Patterns extracted for v0.2.0

## New patterns codified
- `pure-core-thin-pi-seam` — Pure core + thin pi registration seam
- `stateful-module-reset-for-testing` — Stateful module + resetForTesting seam
- `resolver-throw-graceful-degrade` — Resolver-throw graceful degrade
- `enoent-tolerant-read-rethrow` — ENOENT-tolerant read with explicit rethrow
- `temp-fixture-test-scaffold` — Temp-fixture test scaffold

## Inconsistencies flagged

- `resetFragmentCacheForTesting` naming diverged from the module-level
  `resetXForTesting` convention. Fixed in this gate pass by renaming the seam to
  `resetFragmentsForTesting` and updating tests.

## Pattern files written

- `.agents/skills/patterns/pure-core-thin-pi-seam.md`
- `.agents/skills/patterns/stateful-module-reset-for-testing.md`
- `.agents/skills/patterns/resolver-throw-graceful-degrade.md`
- `.agents/skills/patterns/enoent-tolerant-read-rethrow.md`
- `.agents/skills/patterns/temp-fixture-test-scaffold.md`
- `.agents/skills/patterns/SKILL.md`
- `.agents/rules/patterns.md`

## Verification

- `npm run typecheck` clean.
- `npm test` passes (371/371).
