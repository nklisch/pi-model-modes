---
id: gate-patterns-v0.3.0
kind: story
stage: done
tags: [patterns]
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: patterns
created: 2026-07-12
updated: 2026-07-12
---

# Patterns extracted for v0.3.0

## New patterns codified
- `tolerant-config-shape-warn-degrade` — validate user config per key, warn, and degrade safely without crashing session seeding.
- `defensive-clone-at-module-boundary` — clone mutable state on store and read to prevent alias leakage.

## Inconsistencies flagged
- `gate-patterns-clean-inspect-temp-dir` tracks a temp-fixture cleanup divergence in `tests/commands.test.ts`.

## Pattern files written
- `.agents/skills/patterns/tolerant-config-shape-warn-degrade.md`
- `.agents/skills/patterns/defensive-clone-at-module-boundary.md`
- `.agents/skills/patterns/SKILL.md` (updated index)
- `.agents/rules/patterns.md` (generated hook-loaded digest)
