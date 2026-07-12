---
id: gate-tests-style-base-reason-priority
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

# Cover style-over-base cache reason priority

## Priority
Low

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: Cache change-reason priority is model > mode > style > base.

## Gap type
The `style-switched > base-changed` pair is untested.

## Suggested test
Change only style signature and base prompt in one transition and assert the recorded reason is `style-switched`.

## Test location
`tests/cache.test.ts`

## Implementation notes
- Execution capability: inline single-owner test addition; narrow cache classification coverage.
- review_weight: standard (project default)
- Files changed: `tests/cache.test.ts`
- Tests added: simultaneous style-signature and base-prompt change reason priority.
- Verification: `npx vitest --run tests/cache.test.ts` (35 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Fast — test-only story at `standard` weight with green evidence and no escalation signal.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `tests/cache.test.ts` (35 passed).
- Specific check: the test changes ONLY `styleSignature` and `baseSystemPrompt` between two `setCachedResult` calls and asserts `getChangeSignal().lastEntry?.reason === "style-switched"`. Confirmed against `src/cache.ts` `classifyReason` priority `initial > model-switched > mode-switched > style-switched > base-changed`. The assertion pins the exact `style > base` tie-break the gate finding named — the previously untested pair.
- Test integrity: model and mode signatures held constant via `BASE_INPUTS`; the only varying components are the two under test. No gaming.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
