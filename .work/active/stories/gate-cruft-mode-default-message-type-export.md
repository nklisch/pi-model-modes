---
id: gate-cruft-mode-default-message-type-export
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

# Unexport local mode-default message type

## Gate finding

- **Gate**: cruft
- **Release**: `v0.2.0`
- **Priority / confidence**: Low
- **Location**: `src/commands.ts`

## Resolution

Made `MODE_DEFAULT_MESSAGE_TYPE` module-local because no external consumer or test uses it.

## Verification

- `npm run typecheck` clean.
- `npm test` passes (371/371).
