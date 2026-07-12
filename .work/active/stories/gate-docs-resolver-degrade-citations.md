---
id: gate-docs-resolver-degrade-citations
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

# Refresh resolver-degradation command citations

## Drift category
pattern-skill-staleness

## Location
- Doc: `.agents/skills/patterns/resolver-throw-graceful-degrade.md`
- Code: `src/commands.ts:420`, `src/commands.ts:562`, `src/commands.ts:597`

## Required edit
Replace stale command line references with current listing, inspect-resolution, and prompt-degrade locations.

## Implementation notes

- Re-resolved the live resolver/degradation statements in `src/commands.ts`:
  `422` for `/mode` listing, `564` for `/mode:inspect` resolution, and
  `601` for the `--prompt` mode-error fallback.
- Updated the pattern citations in place; no code behavior changed.

## Verification

- Citation audit: `nl -ba src/commands.ts | sed -n '416,427p;558,568p;595,604p'` confirms all three cited statements.
- Transitioned to `stage: review` after the source citations were refreshed.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none remaining

**Notes**: Standard-weight GLM-5.2 independent review verified the item against
its quoted gate criterion and current source. Integrated evidence: 28 test files,
469 tests passed; TypeScript typecheck and diff-check passed.
