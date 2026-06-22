---
id: gate-docs-readme-footer-indicator
kind: story
stage: done
tags: [documentation]
parent: null
depends_on: []
release_binding: v0.2.0
gate_origin: docs
created: 2026-06-22
updated: 2026-06-22
---

# README omits footer mode indicator

## Gate finding

- **Gate**: docs
- **Release**: `v0.2.0`
- **Severity**: Medium
- **Drift category**: readme-staleness
- **Location**: `README.md`

## Resolution

Added a Footer indicator subsection documenting the `mode` footer key, glyph vocabulary, modifier count, unset rendering, and cycle hint.

## Verification

- Rolling-foundation doc fix applied in the same release-gate pass.
- `npm run typecheck` and `npm test` are run after gate fixes before release shipping.
