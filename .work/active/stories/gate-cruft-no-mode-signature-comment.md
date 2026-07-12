---
id: gate-cruft-no-mode-signature-comment
kind: story
stage: done
tags: [cleanup]
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: cruft
created: 2026-07-12
updated: 2026-07-12
---

# Replace the stale NO_MODE_SIGNATURE transition comment

## Confidence
Low

## Category
Stale comment

## Location
`src/cache.ts:25`

## Evidence
The comment says `epic-mode-composition` will replace callers' use of the sentinel, but the shipped resolver intentionally uses it as the canonical no-mode signature.

## Removal
Replace the development-time transition prose with a current-truth one-line contract describing the canonical empty no-mode sentinel.

## Implementation notes
- Execution capability: inline single-owner cleanup; documentation-only comment correction.
- review_weight: standard (project default)
- Files changed: `src/cache.ts`
- Tests added: none.
- Verification: `npm run typecheck` (passed).
- Discrepancies from design: none.
- Adjacent issues parked: none.

---

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none

**Notes**:
- Mode: substrate. Lane: Fast — comment-only cleanup at `standard` weight with green evidence and no escalation signal.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `npm run typecheck`.
- Specific check: behavior-preserving. The 3-line development-time transition comment (`epic-mode-composition will replace …`) is replaced with a single current-truth contract line (`Canonical empty no-mode sentinel, distinct from every non-empty composed signature.`). No code semantics changed — `NO_MODE_SIGNATURE = ""` is unchanged, and the new comment matches how `src/cache.ts` actually treats the sentinel (the canonical no-mode signature, not a transition placeholder). Diff is doc-only.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
