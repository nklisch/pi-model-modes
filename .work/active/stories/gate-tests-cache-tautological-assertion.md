---
id: gate-tests-cache-tautological-assertion
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

# Remove tautological cache assertion

## Gate finding

- **Gate**: tests
- **Release**: `v0.2.0`
- **Priority / confidence**: Low
- **Location**: `tests/cache.test.ts`

## Resolution

Replaced `expect(x).toBe(x)` with concrete defined/not-equal assertions around `baseHash.from` and `baseHash.to`.

## Verification

- `npm run typecheck` clean.
- `npm test` passes (371/371).
