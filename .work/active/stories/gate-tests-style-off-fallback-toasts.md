---
id: gate-tests-style-off-fallback-toasts
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

# Cover global and unset `/style off` fallback toasts

## Priority
Medium

## Spec reference
Item: `feature-style-command-family`
Acceptance criterion: "`/style off` reveals project/global default or unset with a truthful toast."

## Gap type
Global-default and no-default branches absent.

## Suggested test
Clear an override over a global default and over no default; assert exact source-aware and unset notifications.

## Test location
`tests/style-command.test.ts`
