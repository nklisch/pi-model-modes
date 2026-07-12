---
id: gate-tests-style-autocomplete-descriptions
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

# Pin style autocomplete control-token descriptions

## Priority
Low

## Spec reference
Item: `feature-style-command-family`
Rule: descriptions state fragment provenance and control-token semantics.

## Suggested test
Assert `none` communicates suppression, `off` fallback, and `default` durable configuration.
