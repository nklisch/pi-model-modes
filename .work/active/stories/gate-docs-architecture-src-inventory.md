---
id: gate-docs-architecture-src-inventory
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

# Architecture component tree omits source modules

## Gate finding

- **Gate**: docs
- **Release**: `v0.2.0`
- **Severity**: High
- **Drift category**: foundation-doc-assertion
- **Location**: `docs/ARCHITECTURE.md:9-31`

## Resolution

Added `identity.ts` and `autocomplete.ts` to the `src/` component tree and narrowed `assemble.ts` to its actual splice-policy role.

## Verification

- Rolling-foundation doc fix applied in the same release-gate pass.
- `npm run typecheck` and `npm test` are run after gate fixes before release shipping.
