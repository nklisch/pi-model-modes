---
id: gate-docs-cache-key-model-name
kind: story
stage: done
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

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Deep (fresh-context) — touches a foundation-doc assertion (`docs/ARCHITECTURE.md` cache-key formula + `README.md` cache-key summary). Re-derived the cache-key composition from current source rather than trusting the design.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `git diff --check` + `model.name` citation check.
- Specific check: confirmed against `src/cache.ts` `encodeComponents` — the canonical key is `[modelName, modelId, modelProvider, modeSignature, styleSignature, baseHash]` joined by length-delimited `|`. The docs edit adds `model.name` as the FIRST component in both `docs/ARCHITECTURE.md:117` (the `hash(model.name, model.id, model.provider, …)` line) and `README.md:212` (the prose summary), matching the source order. `docs/SPEC.md:101` already listed `model.name` first, so the three docs are now mutually consistent. The item's cited code anchors (`src/cache.ts:54`, `:138`) drift slightly from current line numbers but the underlying claim (six components, `model.name` first) is correct.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
