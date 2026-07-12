---
id: gate-tests-style-noop-notify
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

# Cover style-default no-op notification branches

## Priority
Low

## Spec reference
Item: `feature-style-command-family`
Rule: durable notifications distinguish masking and surviving defaults.

## Suggested test
Cover no-op clear with a surviving cross-scope default and with an active session override.
