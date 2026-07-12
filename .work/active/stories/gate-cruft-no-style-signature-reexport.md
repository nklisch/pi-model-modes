---
id: gate-cruft-no-style-signature-reexport
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

# Remove the unused NO_STYLE_SIGNATURE re-export

## Confidence
Medium

## Category
Unused re-export

## Location
`src/cache.ts:4`

## Evidence
```ts
import { NO_STYLE_SIGNATURE } from "./style.js";
export { NO_STYLE_SIGNATURE } from "./style.js";
```

The import is used internally, but no source, test, or extension imports the re-export from `cache.ts`.

## Removal
Delete only the re-export. Keep the local import used by cache component normalization.

## Implementation notes
- Execution capability: inline single-owner cleanup; one unused export removal with no behavior change.
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
- Mode: substrate. Lane: Fast — unused-export removal at `standard` weight with green evidence and no escalation signal.
- Verification re-run: `npm test` → 415/415 passed (25 files); `npm run typecheck` → clean. Matches implementor's recorded `npm run typecheck`.
- Specific check: behavior-preserving. The diff deletes ONLY the bare `export { NO_STYLE_SIGNATURE } from "./style.js";` re-export from `src/cache.ts`; the local `import { NO_STYLE_SIGNATURE }` (used by cache component normalization at `cache.ts:110`) is retained. Verified no source, test, or extension imports `NO_STYLE_SIGNATURE` from `cache.js` — only `src/style.ts` (the definer) and `src/cache.ts` (the internal consumer) reference the symbol. Re-export was dead surface; removal changes no observable behavior.
- Item advanced `review → done`. Body retained — release-bound to v0.3.0; not archived.
