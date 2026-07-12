---
id: gate-tests-style-base-reason-priority
kind: story
stage: drafting
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
