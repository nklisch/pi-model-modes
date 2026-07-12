---
id: gate-cruft-extract-mode-token-helper
kind: story
stage: drafting
tags: [cleanup]
parent: null
depends_on: []
release_binding: null
gate_origin: cruft
created: 2026-07-12
updated: 2026-07-12
---

# Remove the test-only extractModeArgToken helper

## Confidence
Medium

## Category
Single-use helper / dead public surface

## Location
`src/autocomplete.ts:37`

## Evidence

The exported helper has no production caller; `getModeArgSuggestions` performs the regex match directly and its trigger matrix already covers the behavior.

## Removal
Delete the helper/export and its redundant direct unit block while retaining end-to-end autocomplete trigger tests.
