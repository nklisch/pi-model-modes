---
id: gate-patterns-clean-inspect-temp-dir
kind: story
stage: review
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
