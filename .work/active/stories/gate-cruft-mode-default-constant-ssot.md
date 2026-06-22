---
id: gate-cruft-mode-default-constant-ssot
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

# Deduplicate /mode default constants

## Gate finding

- **Gate**: cruft
- **Release**: `v0.2.0`
- **Priority / confidence**: Medium
- **Location**: `src/commands.ts; src/autocomplete.ts`

## Resolution

Commands now import `MODE_DEFAULT_ARG` and `MODE_DEFAULT_GLOBAL_FLAG` from `autocomplete.ts`, matching the existing `MODE_OFF_ARG` SSOT pattern.

## Verification

- `npm run typecheck` clean.
- `npm test` passes (371/371).
