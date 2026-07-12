---
id: gate-tests-custom-style-sibling-retention
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

# Verify a bad custom style does not poison valid siblings

## Priority
Medium

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: A bad custom path is dropped with a warning while sibling entries still seed.

## Gap type
The existing test selects an unknown style, so it cannot prove the valid sibling survived.

## Suggested test
Select the valid sibling while registering both a valid path and an escaping path; assert the valid custom style resolves and the bad entry warns.

## Test location
`tests/config.test.ts`
