---
id: gate-tests-custom-style-sibling-retention
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

# Verify a bad custom style does not poison valid siblings

## Priority
Medium

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: A bad custom path is dropped with a warning while sibling entries still seed.

## Gap type
The existing test selects an unknown style, so it cannot prove the valid sibling survived.

## Suggested test
Select the valid sibling while registering both a valid path and an escaping path; assert the valid custom style resolves and the bad entry warns.

## Test location
`tests/config.test.ts`

## Implementation notes
- Execution capability: inline single-owner test refinement; narrow, low-risk config coverage.
- review_weight: standard (project default)
- Files changed: `tests/config.test.ts`
- Tests added: strengthened bad-entry coverage to select and resolve the valid sibling.
- Verification: `npx vitest --run tests/config.test.ts` (50 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Fast — test-only story at `standard` weight with green evidence and no escalation signal.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `tests/config.test.ts` (50 passed).
- Specific check: the prior test selected `unknown` and only proved degradation; this revision selects the valid sibling while registering a valid path, an escaping `../escape.md`, and an invalid-name entry, then asserts `resolveActiveStylePlan()` returns `{ name: "valid", source: "custom-global", content: "VALID" }` plus a warning. Confirmed against `src/style.ts` (escape throws → warn-and-drop) and `src/config.ts` `readStyleScope` (invalid name dropped at shape validation, distinct from the escape failure). The assertion now proves retention, not just absence of the bad entry.
- Test integrity: real fixture files + real path resolution; no gaming.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
