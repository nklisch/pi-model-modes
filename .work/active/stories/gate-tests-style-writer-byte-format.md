---
id: gate-tests-style-writer-byte-format
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

# Pin style-writer serialization and temp cleanup

## Priority
Medium

## Spec reference
Item: `feature-style-command-family`
Acceptance criterion: "Writes are two-space JSON with trailing newline and atomic temp+rename."

## Gap type
Style-specific output-byte and temp-cleanup assertions absent.

## Suggested test
Write a style default, inspect raw JSON bytes for two-space indentation/trailing newline, and assert no `.tmp` path remains.

## Test location
`tests/config.test.ts`
