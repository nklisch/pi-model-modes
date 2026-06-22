---
id: gate-tests-keybinding-forward-cycle-pin
kind: story
stage: done
tags: [testing]
parent: null
depends_on: []
release_binding: v0.2.0
gate_origin: tests
created: 2026-06-22
updated: 2026-06-22
---

# Pin forward-cycle expected preset

## Gate finding

- **Gate**: tests
- **Release**: `v0.2.0`
- **Priority / confidence**: Low
- **Location**: `tests/keybinding.test.ts; tests/footer-wiring.test.ts`

## Resolution

Pinned forward cycle from unset to the first sorted preset (`create`) in both keybinding and footer-wiring tests.

## Verification

- `npm run typecheck` clean.
- `npm test` passes (371/371).
