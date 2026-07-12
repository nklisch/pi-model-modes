---
id: gate-tests-custom-global-source-resolution
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

# Verify global custom styles resolve with the global source

## Priority
Medium

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: Custom style plans report `custom-global` or `custom-project` according to their defining scope.

## Gap type
All resolver tests use project scope; `custom-global` is only hand-fed to a renderer test.

## Suggested test
Seed a global-scope custom entry and assert `resolveActiveStylePlan()` returns its name, content, and `source: "custom-global"`.

## Test location
`tests/style.test.ts`

## Implementation notes
- Execution capability: inline single-owner test addition; narrow, low-risk resolver coverage.
- review_weight: standard (project default)
- Files changed: `tests/style.test.ts`
- Tests added: global custom-style source resolution.
- Verification: `npx vitest --run tests/style.test.ts` (13 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.
