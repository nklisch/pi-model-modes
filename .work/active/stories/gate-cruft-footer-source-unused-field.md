---
id: gate-cruft-footer-source-unused-field
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

# Remove unused footer source field

## Gate finding

- **Gate**: cruft
- **Release**: `v0.2.0`
- **Priority / confidence**: Low
- **Location**: `src/footer.ts; tests/footer.test.ts`

## Resolution

Removed `ModeFooterInputs.source` and the corresponding unused resolver read/call-site test inputs.

## Verification

- `npm run typecheck` clean.
- `npm test` passes (371/371).
