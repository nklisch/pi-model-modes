---
id: gate-tests-full-style-splice-order
kind: story
stage: done
tags: [testing]
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: tests
created: 2026-07-12
updated: 2026-07-12
---

# Cover style ordering with base overlay and modifier populated

## Priority
Low

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: Full order is identity, style, base overlay, agency, quality, scope, modifiers, then pi base.

## Gap type
Existing style-order coverage leaves the optional base-overlay and modifier slots empty.

## Suggested test
Populate all fragment slots with sentinels and assert the exact fully composed prompt order.

## Test location
`tests/handler-style.test.ts`

## Implementation notes
- Execution capability: inline single-owner integration test; deterministic ordering coverage.
- review_weight: standard (project default)
- Files changed: `tests/handler-style.test.ts`
- Tests added: exact identity/style/base-overlay/axes/modifier/pi-base splice order with every slot populated.
- Verification: `npx vitest --run tests/handler-style.test.ts` (7 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Fast — test-only story at `standard` weight with green evidence and no escalation signal.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `tests/handler-style.test.ts` (7 passed).
- Specific check: the test populates EVERY optional slot — base overlay (`base/overlay.md`), modifier (`modifiers/tdd.md`), style (`STYLE ONE`), and a 4-axis mode — and asserts the byte-exact splice order `[identity, STYLE ONE, BASE OVERLAY, AGENCY, QUALITY, SCOPE, MODIFIER, base]`. Confirmed against `src/assemble.ts` (identity → style → `plan.fragments` in resolver order → base) and the resolver's `[base overlay, agency, quality, scope, modifiers]` fragment materialization order. The previous order test left overlay/modifier empty, so this fills the gap the gate finding named.
- Test integrity: real fixture files for every slot; byte-exact `toBe` over the full join.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
