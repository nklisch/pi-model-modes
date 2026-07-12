---
id: gate-tests-writing-style-none-seeding
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

# Cover project none masking a global writing style

## Priority
Low

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: `writingStyle: "none"` is an explicit no-style value that masks a global selection.

## Gap type
Merge and resolver branches are covered separately, but not through config seeding end to end.

## Suggested test
Configure global `clear` and project `none`, call `applyStyleFromConfig`, and assert the effective plan has `source: "none"` and empty content/signature.

## Test location
`tests/config.test.ts`

## Implementation notes
- Execution capability: inline single-owner test addition; narrow, low-risk config-seeding coverage.
- review_weight: standard (project default)
- Files changed: `tests/config.test.ts`
- Tests added: end-to-end project `none` masking a global bundled style selection.
- Verification: `npx vitest --run tests/config.test.ts` (52 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Fast — test-only story at `standard` weight with green evidence and no escalation signal.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `tests/config.test.ts` (52 passed).
- Specific check: the test sets global `clear` and project `none`, runs `applyStyleFromConfig`, then asserts `resolveActiveStylePlan()` is `{ source: "none", content: "", signature: "" }`. Confirmed against `src/config.ts` (`selection = project.writingStyle ?? global.writingStyle` → `"none"`) and `src/style.ts` (`selection === "none"` → `noStylePlan("none")`). The assertion pins the explicit-mask contract end-to-end through the seeding path, not just a resolver branch.
- Test integrity: real config files + real merge; no gaming.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
