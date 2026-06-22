---
id: gate-docs-architecture-test-inventory
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

# Architecture tests listing is stale

## Gate finding

- **Gate**: docs
- **Release**: `v0.2.0`
- **Severity**: High
- **Drift category**: foundation-doc-assertion
- **Location**: `docs/ARCHITECTURE.md:38-48`

## Resolution

Refreshed the `tests/` component tree to match the current test inventory, including autocomplete, footer, presets, mode-command, and harness files.

## Verification

- Rolling-foundation doc fix applied in the same release-gate pass.
- `npm run typecheck` and `npm test` are run after gate fixes before release shipping.
