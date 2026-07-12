---
id: gate-tests-style-listing-vanished
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

# Exercise vanished custom style through the `/style` listing seam

## Priority
Low

## Spec reference
Item: `feature-style-command-family`
Panel contract: resolution failures render explicitly without crashing or hiding the catalog.

## Suggested test
Delete an active custom style file, invoke bare `/style`, and assert both the unresolvable effective line and available catalog are emitted.
