---
id: gate-docs-pure-core-citations
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

# Refresh pure-core pattern command citations

## Drift category
pattern-skill-staleness

## Location
- Doc: `.agents/skills/patterns/pure-core-thin-pi-seam.md:20`
- Code: `src/commands.ts:180`, `src/commands.ts:537`

## Required edit
Replace stale `commands.ts` line citations with the current `renderModeInspect` and `registerModeInspectCommand` lines.

## Implementation notes

- Re-resolved the exported symbol declarations in `src/commands.ts`: `180`
  (`renderModeInspect`) and `537` (`registerModeInspectCommand`).
- Updated the pattern citation in place; no code behavior changed.

## Verification

- Citation audit: `grep -nE '^export function (renderModeInspect|registerModeInspectCommand)' src/commands.ts` matches `180` and `537`.
- Transitioned to `stage: review` after the source citation was refreshed.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none remaining

**Notes**: Standard-weight GLM-5.2 independent review verified the item against
its quoted gate criterion and current source. Integrated evidence: 28 test files,
469 tests passed; TypeScript typecheck and diff-check passed.
