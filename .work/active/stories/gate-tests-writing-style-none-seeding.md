---
id: gate-tests-writing-style-none-seeding
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

# Cover project none masking a global writing style

## Priority
Low

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: `writingStyle: "none"` is an explicit no-style value that masks a global selection.

## Gap type
Merge and resolver branches are covered separately, but not through config seeding end to end.

## Suggested test
Configure global `clear` and project `none`, call `applyStyleFromConfig`, and assert the effective plan has `source: "none"` and empty content/signature.

## Test location
`tests/config.test.ts`

## Implementation notes
- Execution capability: inline single-owner test addition; narrow, low-risk config-seeding coverage.
- review_weight: standard (project default)
- Files changed: `tests/config.test.ts`
- Tests added: end-to-end project `none` masking a global bundled style selection.
- Verification: `npx vitest --run tests/config.test.ts` (52 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.
