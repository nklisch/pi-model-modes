---
id: gate-tests-none-selection-provenance
kind: story
stage: done
tags: [testing]
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: tests
created: 2026-07-12
updated: 2026-07-12
---

# Cover none-style selection provenance at every tier

## Priority
High

## Spec reference
Item: `feature-style-command-family`
Acceptance criterion: "`none` at either tier yields empty content/signature while reporting its selection tier."

## Gap type
Missing state partitions for override/project/global `none` provenance.

## Suggested test
Assert `fragmentSource: none`, empty content/signature, and the correct `selectionSource` for override, project default, and global default.

## Test location
`tests/style.test.ts`, `tests/config.test.ts`, `tests/commands.test.ts`

## Implementation notes

- Added direct resolver coverage for `none` as an ephemeral override and as
  both project and global durable defaults.
- Each tier assertion pins `fragmentSource: none`, the empty content and empty
  signature sentinels, and the authoritative `selectionSource`.
- Existing config and inspect tests already cover project masking and the
  inspect label; no duplicate coverage was added to those files.
- No production behavior changed.

## Verification

- `npm test -- tests/style.test.ts` — 1 file, 19 tests passed.
- Transitioned to `stage: review` after bounded verification.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none remaining

**Notes**: Standard-weight GLM-5.2 independent review verified the item against
its quoted gate criterion and current source. Integrated evidence: 28 test files,
469 tests passed; TypeScript typecheck and diff-check passed.
