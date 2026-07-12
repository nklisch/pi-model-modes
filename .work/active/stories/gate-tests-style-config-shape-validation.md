---
id: gate-tests-style-config-shape-validation
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

# Cover malformed writing-style config field shapes

## Priority
Low

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: Style config shape validation tolerantly drops non-string selections, non-object maps, and non-string custom-style values with warnings.

## Gap type
Complementary malformed-input partitions are untested.

## Suggested test
Feed malformed `writingStyle` and `customStyles` field shapes, then assert invalid values are dropped, valid siblings remain, and warnings are emitted.

## Test location
`tests/config.test.ts`

## Implementation notes
- Execution capability: inline single-owner test addition; narrow malformed-input partition coverage.
- review_weight: standard (project default)
- Files changed: `tests/config.test.ts`
- Tests added: malformed writing-style scalar, custom-style map, and custom-style value validation with valid sibling retention.
- Verification: `npx vitest --run tests/config.test.ts` (51 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.
