---
id: gate-tests-style-default-unreadable
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

# Cover unreadable style-default display state

## Priority
Medium

## Spec reference
Item: `feature-style-command-family`
Acceptance criterion: "`/style default` reports global, project, and effective durable values."

## Gap type
Malformed-config display/error partition absent.

## Suggested test
Feed malformed global/project JSON through `readStyleDefaultSources` and `formatStyleDefaultListing`; assert `(unreadable)` is displayed without throwing.

## Test location
`tests/config.test.ts`, `tests/style-command.test.ts`
