---
id: gate-tests-full-style-splice-order
kind: story
stage: review
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
