---
id: gate-patterns-clean-inspect-temp-dir
kind: story
stage: done
tags: [refactor, testing]
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: patterns
created: 2026-07-12
updated: 2026-07-12
---

# Clean up inspect test temporary directories

## Existing pattern
`temp-fixture-test-scaffold`

## Divergence
`tests/commands.test.ts:494` creates an `inspect-broken-*` temp directory inside `switchToBrokenFragmentRoot`, but the surrounding `afterEach` only resets fragment state and never removes the directory.

## Required reconciliation
Hoist the temp path to the describe scope, assign it from the helper, and remove/reset it in `afterEach` with `rmSync(..., { recursive: true, force: true })`. Preserve existing test behavior.

## Implementation notes
- Execution capability: inline single-owner test-fixture cleanup; direct application of the existing temp scaffold pattern.
- review_weight: standard (project default)
- Files changed: `tests/commands.test.ts`
- Tests added: none; existing inspect command tests verify preserved behavior.
- Verification: `npx vitest --run tests/commands.test.ts` (71 passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Fast — test-fixture cleanup at `standard` weight with green evidence and no escalation signal.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `npx vitest --run tests/commands.test.ts` (71 passed).
- Specific check: behavior-preserving. The diff hoists a describe-scope `inspectBrokenRoot`, assigns it from `switchToBrokenFragmentRoot`, and tears it down in the existing `afterEach` via `rmSync(..., { recursive: true, force: true })`. No test logic changed — the broken-root setup, the assertions, and the surrounding resets are untouched. Direct application of the `temp-fixture-test-scaffold` pattern; closes the temp-dir leak the gate finding named.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
