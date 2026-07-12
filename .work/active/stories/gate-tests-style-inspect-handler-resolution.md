---
id: gate-tests-style-inspect-handler-resolution
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

# Verify inspect resolves style state through its command handler

## Priority
Medium

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: `/mode:inspect` emits the effective style and source for bundled, custom, none, unset, and unresolvable states.

## Gap type
Renderer states are covered, but the registered handler's resolver-to-render wiring is only exercised with style unset.

## Suggested test
Seed a custom project style, invoke the registered inspect handler, and assert the emitted panel contains `Style: <name> (custom, project)`; include a real unresolvable resolver case if the harness permits.

## Test location
`tests/commands.test.ts`

## Implementation notes
- Execution capability: inline single-owner command-seam test; focused resolver-to-render wiring coverage.
- review_weight: standard (project default)
- Files changed: `tests/commands.test.ts`
- Tests added: registered inspect handler resolves and emits a custom project style.
- Verification: `npx vitest --run tests/commands.test.ts` (71 passed).
- Discrepancies from design: omitted the optional unresolvable case because the required real custom-state seam is fully exercised.
- Adjacent issues parked: none.

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Fast — test-only story at `standard` weight with green evidence and no escalation signal.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `tests/commands.test.ts` (71 passed).
- Specific check: the test seeds a custom project style, invokes the REGISTERED `registerModeInspectCommand` handler (not a renderer unit), and asserts the emitted panel contains `Style: team (custom, project)`. Confirmed against `src/commands.ts` `formatStyleLine` (`source !== bundled/custom-global/none/unset` → `Style: ${name} (custom, project)`). This is the previously-untested handler→resolver→render wiring for a real custom state.
- Discrepancy review: implementor omitted the optional unresolvable case (`if the harness permits`). The required custom-state seam is fully exercised, and unresolvable rendering is already covered in `commands.test.ts` renderer tests. Acceptable — the optional branch was explicitly conditional.
- Test integrity: goes through `makePi()` + the real handler dispatch + `sendMessage` capture; no gaming.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
