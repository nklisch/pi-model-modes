---
id: gate-tests-style-base-reason-priority
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

# Cover style-over-base cache reason priority

## Priority
Low

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: Cache change-reason priority is model > mode > style > base.

## Gap type
The `style-switched > base-changed` pair is untested.

## Suggested test
Change only style signature and base prompt in one transition and assert the recorded reason is `style-switched`.

## Test location
`tests/cache.test.ts`

## Implementation notes
- Execution capability: inline single-owner test addition; narrow cache classification coverage.
- review_weight: standard (project default)
- Files changed: `tests/cache.test.ts`
- Tests added: simultaneous style-signature and base-prompt change reason priority.
- Verification: `npx vitest --run tests/cache.test.ts` (35 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.
