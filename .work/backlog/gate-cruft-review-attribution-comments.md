---
id: gate-cruft-review-attribution-comments
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

# Remove review-attribution tags from source comments

## Confidence
Low

## Category
Stale process-attribution comments

## Location
`src/config.ts`, `src/commands.ts`, `src/autocomplete.ts`

## Removal
Strip reviewer names/severity tags while preserving each substantive WHY; git and work-item history retain process attribution.
