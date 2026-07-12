---
id: gate-tests-global-bundled-style-write
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

# Cover bundled style selection in global config writes

## Priority
Medium

## Spec reference
Item: `feature-style-command-family`
Decision: global defaults may select bundled styles or globally registered custom styles.

## Gap type
Bundled-name/global-scope valid partition absent.

## Suggested test
Write bundled `compact` to global scope and assert persisted value plus resolved bundled/global provenance.

## Test location
`tests/config.test.ts`
