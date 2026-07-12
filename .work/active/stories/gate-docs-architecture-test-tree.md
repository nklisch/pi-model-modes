---
id: gate-docs-architecture-test-tree
kind: story
stage: drafting
tags: [documentation]
parent: null
depends_on: []
release_binding: null
gate_origin: docs
created: 2026-07-12
updated: 2026-07-12
---

# Complete the architecture test-file tree

## Drift category
foundation-doc-assertion

## Location
- Doc: `docs/ARCHITECTURE.md:44`
- Code: `tests/`

## Reality
The exhaustive component tree omits the new style command/autocomplete tests and two existing style test files.

## Required edit
Update the tests subtree to match current files, including `style-autocomplete-seam.test.ts`, `style-autocomplete.test.ts`, `style-command.test.ts`, `handler-style.test.ts`, and `style.test.ts`.
