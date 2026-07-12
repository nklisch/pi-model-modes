---
id: gate-patterns-command-seam-thinning
kind: story
stage: drafting
tags: [refactor]
parent: null
depends_on: []
release_binding: null
gate_origin: patterns
created: 2026-07-12
updated: 2026-07-12
---

# Thin mode and style Pi command seams

## Existing pattern
`pure-core-thin-pi-seam`

## Divergence
`src/commands.ts` and `src/style-command.ts` keep parsing, state transitions, config orchestration, error mapping, and notification selection inside registered handlers rather than adapting through a pure command-action core.

## Required direction
Extract pure command decision/action planning while retaining the exact slash-command grammar, messages, state transitions, filesystem behavior, and Pi side effects. This is a behavior-preserving structural change.
