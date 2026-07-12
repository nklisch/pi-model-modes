---
id: gate-cruft-no-mode-signature-comment
kind: story
stage: implementing
tags: [cleanup]
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: cruft
created: 2026-07-12
updated: 2026-07-12
---

# Replace the stale NO_MODE_SIGNATURE transition comment

## Confidence
Low

## Category
Stale comment

## Location
`src/cache.ts:25`

## Evidence
The comment says `epic-mode-composition` will replace callers' use of the sentinel, but the shipped resolver intentionally uses it as the canonical no-mode signature.

## Removal
Replace the development-time transition prose with a current-truth one-line contract describing the canonical empty no-mode sentinel.
