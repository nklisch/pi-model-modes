---
id: gate-docs-enoent-config-citation
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

# Refresh ENOENT config-reader citation

## Drift category
pattern-skill-staleness

## Location
- Doc: `.agents/skills/patterns/enoent-tolerant-read-rethrow.md:17`
- Code: `src/config.ts:74`

## Required edit
Replace the stale `src/config.ts:71` citation with the current reader location.

## Implementation notes

- Re-resolved `readConfigFile` at `src/config.ts:74` before editing.
- Updated the config-reader citation in place; no code behavior changed.

## Verification

- Citation audit: `grep -nE '^function readConfigFile' src/config.ts` matches line `74`.
- Transitioned to `stage: review` after the source citation was refreshed.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none remaining

**Notes**: Standard-weight GLM-5.2 independent review verified the item against
its quoted gate criterion and current source. Integrated evidence: 28 test files,
469 tests passed; TypeScript typecheck and diff-check passed.
