---
id: gate-tests-style-degrade-preserves-mode
kind: story
stage: done
tags: [testing]
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: tests
created: 2026-07-12
updated: 2026-07-12
---

# Verify style degradation preserves the active mode

## Priority
High

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: When a custom style vanishes, graceful degradation returns identity + active mode + base without the style and warns once.

## Gap type
Specified mode-active error case is not asserted; the existing vanished-style test has no active mode.

## Suggested test
Seed a custom style and a mode, delete the style file, run `handleBeforeAgentStart`, then assert the exact identity + mode fragments + base composition, absence of style content, and one warning.

## Test location
`tests/handler-style.test.ts`

## Implementation notes
- Execution capability: inline single-owner integration test; focused high-priority degradation contract.
- review_weight: standard (project default)
- Files changed: `tests/handler-style.test.ts`
- Tests added: vanished custom style preserves exact active-mode composition and warns once.
- Verification: `npx vitest --run tests/handler-style.test.ts` (6 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Fast — test-only story at `standard` weight with green evidence and no escalation signal. (High priority per gate finding, but still a single integration test with no escalation signal — Fast applies.)
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `tests/handler-style.test.ts` (6 passed).
- Specific check: the test seeds a custom style + an active mode, `rmSync`s the style file, runs `handleBeforeAgentStart` twice, and asserts BOTH turns produce `[identity, AGENCY, QUALITY, SCOPE, base]` (no `STYLE ONE`), and that `warn` was called exactly once. Confirmed against `src/handler.ts` `resolveStyleGracefully` (catches the vanished-file throw, warns once via `warnedStyleErrors` dedup, returns `noStylePlan("unset")`) and `spliceSystemPrompt` (mode-defined branch uses `assembleSystemPrompt`, dropping the empty style fragment). The second turn hits the cache, so no second warn — the count of 1 is the load-bearing assertion. This is the previously-unasserted mode-active degradation contract.
- Test integrity: real fixture deletion + real cache interaction; the warn-once count would break if dedup regressed.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
