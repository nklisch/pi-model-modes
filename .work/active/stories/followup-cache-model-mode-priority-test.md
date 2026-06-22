---
id: followup-cache-model-mode-priority-test
kind: story
stage: done
tags: [tests]
parent: null
depends_on: []
release_binding: v0.2.0
gate_origin: tests
created: 2026-06-21
updated: 2026-06-21
review_origin: epic-identity-injection-cache-and-change-signal
---

# Add Cache Priority Regression Test for Simultaneous Model + Mode Changes

## Source

Review of `epic-identity-injection-cache-and-change-signal` on 2026-06-21.

## Finding

`tests/cache.test.ts` covers simultaneous `model+base` and `mode+base` changes, but it does not explicitly cover the highest-priority simultaneous case: `model+mode` (or `model+mode+base`) should classify as `model-switched`.

The implementation is correct today (`src/cache.ts` checks model before mode), so this is not a blocker. Add a focused regression test so a future reorder to `mode` before `model` cannot slip through while the existing priority tests still pass.

## Suggested fix

Add a test under `change signal — reason classification`:

- seed cache with `{ modelId: "m1", modeSignature: "base:chill" }`
- miss/set with `{ modelId: "m2", modeSignature: "base:focus" }`
- assert `getChangeSignal().lastEntry?.reason === "model-switched"`

## Acceptance criteria

- [ ] Simultaneous model+mode changes classify as `model-switched`.
- [ ] Existing cache tests still pass.


## Gate implementation notes (2026-06-22)

Implemented by adding the simultaneous model+mode priority regression in `tests/cache.test.ts`; the reason remains `model-switched`.

Verification: `npm run typecheck`; `npm test` (371/371).
