---
id: gate-docs-readme-mode-none-command
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

# README omits `/mode none` command form

## Gate finding

- **Gate**: docs
- **Release**: `v0.2.0`
- **Severity**: Low
- **Drift category**: readme-staleness
- **Location**: `README.md:38-48`

## Resolution

Added `/mode none` to the Commands table as a virtual no-mode override distinct from `/mode off`.

## Verification

- Rolling-foundation doc fix applied in the same release-gate pass.
- `npm run typecheck` and `npm test` are run after gate fixes before release shipping.
