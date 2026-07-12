---
id: gate-tests-custom-style-sibling-map
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

# Verify style writes preserve non-empty customStyles maps

## Priority
Medium

## Spec reference
Item: `feature-style-command-family`
Acceptance criterion: "Writes preserve defaultMode, customStyles, cycleKeybinding, and unknown sibling keys."

## Gap type
Non-empty `customStyles` sibling partition absent.

## Suggested test
Seed multiple custom style registrations, write `writingStyle`, and assert the complete registration map remains byte/structure equivalent.

## Test location
`tests/config.test.ts`
