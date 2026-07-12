---
id: gate-tests-writing-style-none-seeding
kind: story
stage: implementing
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
