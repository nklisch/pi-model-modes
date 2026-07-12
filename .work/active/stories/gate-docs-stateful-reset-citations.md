---
id: gate-docs-stateful-reset-citations
kind: story
stage: done
tags: [documentation]
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: docs
created: 2026-07-12
updated: 2026-07-12
---

# Refresh stateful-reset config citations

## Drift category
pattern-skill-staleness

## Location
- Doc: `.agents/skills/patterns/stateful-module-reset-for-testing.md:53`
- Code: `src/config.ts:54`, `src/config.ts:649`, `src/config.ts:658`

## Required edit
Replace stale config state/reset line references with current locations.

## Implementation notes

- Re-resolved the config path state and test seam declarations in
  `src/config.ts`: `54`/`55` for the two overrides, `649` for
  `setConfigPathsForTesting`, and `658` for `resetConfigForTesting`.
- Updated the pattern citation in place; no code behavior changed.

## Verification

- Citation audit: `grep -nE '^let (globalPathOverride|projectPathOverride)|^export function (setConfigPathsForTesting|resetConfigForTesting)' src/config.ts` matches the cited locations.
- Transitioned to `stage: review` after the source citation was refreshed.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none remaining

**Notes**: Standard-weight GLM-5.2 independent review verified the item against
its quoted gate criterion and current source. Integrated evidence: 28 test files,
469 tests passed; TypeScript typecheck and diff-check passed.
