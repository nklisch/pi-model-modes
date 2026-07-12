---
id: gate-patterns-config-custom-styles-warning
kind: story
stage: drafting
tags: []
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: patterns
created: 2026-07-12
updated: 2026-07-12
---

# Warn when loadPluginConfig drops malformed customStyles

## Existing pattern
`tolerant-config-shape-warn-degrade`

## Divergence
`src/config.ts:123` silently omits a malformed `customStyles` shape in the merged general loader, while the project pattern requires per-key warnings before safe degradation.

## Required direction
Align the loader's observable warning behavior with the established pattern and preserve valid siblings. This is intentionally untagged: adding a warning is observable behavior and fails the project's behavior-preserving `[refactor]` test.
