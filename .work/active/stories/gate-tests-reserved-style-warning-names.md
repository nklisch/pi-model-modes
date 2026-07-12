---
id: gate-tests-reserved-style-warning-names
kind: story
stage: drafting
tags: [testing]
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: tests
created: 2026-07-12
updated: 2026-07-12
---

# Pin reserved custom-style warning token names

## Priority
Medium

## Spec reference
Item: `feature-style-command-family`
Acceptance criterion: reserved names `none`, `off`, and `default` warn with the token named.

## Gap type
Warning count covered, required per-token content not covered.

## Suggested test
Assert each reserved token appears quoted in at least one warning while valid sibling registrations survive.

## Test location
`tests/config.test.ts`
