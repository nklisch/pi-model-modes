---
id: gate-docs-refresh-pattern-citations
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

# Refresh pattern-catalog citations shifted by writing styles

## Drift category
Pattern-skill-staleness

## Location
- Docs: `.agents/skills/patterns/{resolver-throw-graceful-degrade,pure-core-thin-pi-seam,stateful-module-reset-for-testing,enoent-tolerant-read-rethrow}.md`
- Code: `src/{commands,cache,config}.ts`

## Current doc text
The pattern files cite pre-feature line numbers such as `src/commands.ts:416`, `src/cache.ts:231`, and `src/config.ts:402`.

## Reality
The writing-style implementation shifted the referenced definitions. Current anchors include `renderModeInspect` at `src/commands.ts:162`, resolver surfaces around `:444/:586`, cache state/reset at `src/cache.ts:96/:242`, and config read/override/reset at `src/config.ts:71/:513/:522`.

## Required edit
Refresh only the stale citations to current source lines. Regenerate the patterns index/digest if the pattern gate changes its entry block; do not add historical prose.

## Implementation notes
- Execution capability: inline single-owner documentation maintenance; bounded citation-only refresh.
- review_weight: standard (project default)
- Files changed: `.agents/skills/patterns/resolver-throw-graceful-degrade.md`, `.agents/skills/patterns/pure-core-thin-pi-seam.md`, `.agents/skills/patterns/stateful-module-reset-for-testing.md`, `.agents/skills/patterns/enoent-tolerant-read-rethrow.md`
- Tests added: none.
- Verification: `git diff --check -- .agents/skills/patterns` and stale-citation grep (passed).
- Discrepancies from design: the patterns index/digest entry block was unchanged, so regeneration was not needed.
- Adjacent issues parked: none.

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Deep (fresh-context) — touches pattern-catalog assertions (`.agents/skills/patterns/*.md` line citations). Re-verified each new citation against current source rather than trusting the design.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `git diff --check` + stale-citation grep.
- Specific check (every refreshed citation read against current source):
  - `enoent-tolerant-read-rethrow.md`: `src/config.ts:71` → `function readConfigFile` (whose body has the ENOENT try/catch shown); `src/fragments.ts:129` → the base-overlay `statSync` try block. The untouched `src/fragments.ts:53` (`discoverAxis`) citation was also spot-checked — still correct.
  - `pure-core-thin-pi-seam.md`: `src/commands.ts:162` → `export function renderModeInspect`; `src/commands.ts:559` → `export function registerModeInspectCommand`; `src/footer.ts:125` → `export function formatModeFooter`; `src/footer.ts:171` → `export function refreshModeFooter`. Snippet text matches source.
  - `resolver-throw-graceful-degrade.md`: `src/footer.ts:178` → footer-refresh resolver try block; `src/commands.ts:441` → `/mode` listing resolver try block; `src/commands.ts:586` and `:614` → inspect's resolver read and `--prompt` modeError fallback. All anchors sit inside the relevant graceful-degrade code.
  - `stateful-module-reset-for-testing.md`: `src/cache.ts:92`/`:238`, `src/resolver.ts:86`/`:329`, `src/config.ts:51`/`:513`/`:522` — every cited line is the named module-scope state declaration or `resetXForTesting`/`setXForTesting` function. Snippet text matches source.
- Pattern index/digest (`SKILL.md`, `.agents/rules/patterns.md`) carry only one-liner descriptions with no line numbers, so no regeneration was needed — implementor's discrepancy note is correct.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
