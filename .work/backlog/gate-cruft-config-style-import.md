---
id: gate-cruft-config-style-import
kind: story
stage: drafting
tags: [cleanup]
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: cruft
created: 2026-07-12
updated: 2026-07-12
---

# Merge duplicate style imports in config

## Confidence
Low

## Category
Import organization debris

## Location
`src/config.ts:5`

## Removal
Merge adjacent imports from `./style.js` without changing behavior.
