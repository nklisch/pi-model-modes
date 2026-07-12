---
id: gate-tests-style-catalog-defensive-copy
kind: story
stage: implementing
tags: [testing]
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: tests
created: 2026-07-12
updated: 2026-07-12
---

# Verify style catalog results cannot mutate internal state

## Priority
Critical

## Spec reference
Item: `feature-style-command-family`
Acceptance criterion: "Returned registries/catalog data cannot mutate internal state."

## Gap type
Acceptance criterion with no direct regression test.

## Suggested test
Mutate the array and an element returned by `listAvailableStyles()`, then call it again and assert the fresh catalog is unchanged.

## Test location
`tests/style.test.ts`
