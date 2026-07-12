---
id: gate-tests-none-selection-provenance
kind: story
stage: implementing
tags: [testing]
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: tests
created: 2026-07-12
updated: 2026-07-12
---

# Cover none-style selection provenance at every tier

## Priority
High

## Spec reference
Item: `feature-style-command-family`
Acceptance criterion: "`none` at either tier yields empty content/signature while reporting its selection tier."

## Gap type
Missing state partitions for override/project/global `none` provenance.

## Suggested test
Assert `fragmentSource: none`, empty content/signature, and the correct `selectionSource` for override, project default, and global default.

## Test location
`tests/style.test.ts`, `tests/config.test.ts`, `tests/commands.test.ts`
