---
id: gate-docs-cache-key-model-name
kind: story
stage: review
tags: [documentation]
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: docs
created: 2026-07-12
updated: 2026-07-12
---

# Include model.name in cache-key documentation

## Drift category
Foundation-doc-assertion

## Location
- Docs: `docs/ARCHITECTURE.md:118`, `README.md:212`
- Code: `src/cache.ts:54`, `src/cache.ts:138`

## Current doc text
Both cache-key summaries enumerate model id/provider, mode, style, and base hash but omit `model.name`.

## Reality
The live key has six components: `model.name`, `model.id`, `model.provider`, mode signature, style signature, and the base-prompt hash. `docs/SPEC.md` already states this correctly.

## Required edit
Insert `model.name` as the first cache-key component in ARCHITECTURE and README, replacing the incomplete assertion in place.

## Implementation notes
- Execution capability: inline single-owner documentation correction; two bounded current-state assertions.
- review_weight: standard (project default)
- Files changed: `docs/ARCHITECTURE.md`, `README.md`
- Tests added: none.
- Verification: `git diff --check -- docs/ARCHITECTURE.md README.md` plus direct `model.name` citation check (passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.
