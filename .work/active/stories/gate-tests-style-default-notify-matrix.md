---
id: gate-tests-style-default-notify-matrix
kind: story
stage: drafting
tags: [testing]
parent: null
depends_on: []
release_binding: null
gate_origin: tests
created: 2026-07-12
updated: 2026-07-12
---

# Cover style-default notification masking matrix

## Priority
Medium

## Spec reference
Item: `feature-style-command-family`
Rule: durable notifications distinguish override masking, project-over-global masking, and newly effective values.

## Gap type
Five valid formatter decision branches are untested.

## Suggested test
Mirror the mode default notification table for clear/set, surviving default, active override, higher-precedence project default, and immediately effective writes.

## Test location
`tests/style-command.test.ts`
