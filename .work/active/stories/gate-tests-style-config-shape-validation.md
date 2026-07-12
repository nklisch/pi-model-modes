---
id: gate-tests-style-config-shape-validation
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

# Cover malformed writing-style config field shapes

## Priority
Low

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: Style config shape validation tolerantly drops non-string selections, non-object maps, and non-string custom-style values with warnings.

## Gap type
Complementary malformed-input partitions are untested.

## Suggested test
Feed malformed `writingStyle` and `customStyles` field shapes, then assert invalid values are dropped, valid siblings remain, and warnings are emitted.

## Test location
`tests/config.test.ts`

## Implementation notes
- Execution capability: inline single-owner test addition; narrow malformed-input partition coverage.
- review_weight: standard (project default)
- Files changed: `tests/config.test.ts`
- Tests added: malformed writing-style scalar, custom-style map, and custom-style value validation with valid sibling retention.
- Verification: `npx vitest --run tests/config.test.ts` (51 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Fast — test-only story at `standard` weight with green evidence and no escalation signal.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `tests/config.test.ts` (51 passed).
- Specific check: the test feeds malformed shapes (`writingStyle: 42`, `customStyles: []`, a non-string map value) and asserts `readStyleConfigScopes` returns the dropped/degraded shape (`global.writingStyle === undefined`, `global.customStyles === {}`, `project.customStyles === { valid: "valid.md" }`) with exactly three warnings. Confirmed against `src/config.ts` `readStyleScope` (string check, `isRecord` check, per-value `typeof === "string"` check). Assertions pin the exact tolerant-degrade contract from the gate finding.
- Test integrity: asserts both the dropped values and the surviving sibling; warning count is exact, not `toHaveBeenCalled`.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
