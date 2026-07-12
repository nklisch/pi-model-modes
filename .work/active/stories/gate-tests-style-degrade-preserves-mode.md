---
id: gate-tests-style-degrade-preserves-mode
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

# Verify style degradation preserves the active mode

## Priority
High

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: When a custom style vanishes, graceful degradation returns identity + active mode + base without the style and warns once.

## Gap type
Specified mode-active error case is not asserted; the existing vanished-style test has no active mode.

## Suggested test
Seed a custom style and a mode, delete the style file, run `handleBeforeAgentStart`, then assert the exact identity + mode fragments + base composition, absence of style content, and one warning.

## Test location
`tests/handler-style.test.ts`
