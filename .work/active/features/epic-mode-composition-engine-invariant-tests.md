---
id: epic-mode-composition-engine-invariant-tests
kind: feature
stage: drafting
tags: [tests]
parent: epic-mode-composition
depends_on: [epic-mode-composition-handler-wiring]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Engine Invariant Tests — full Invariant 1 + mode cache-stability + deterministic order

## Brief

This feature delivers the engine-level acceptance tests that only become possible
once a mode actually composes. It **upgrades `tests/clean-base.test.ts` from the
scaffolding form to the full SPEC Invariant 1** (the handoff obligation the epic
inherited from `epic-scaffold-handler`): across N consecutive turns with a mode
set, the assembled prompt contains **exactly one identity line and exactly one
copy of each selected fragment** — catching double-append and cache-leak across
the real splice. It adds **cache-stability with a mode set** (byte-identical
assembled output across N no-change turns where model + mode + base are all
stable — Invariant 2's real workout) and a **deterministic-ordering** test
(fragment order is reproducible across turns and independent of discovery/iteration
nondeterminism).

These tests exercise the wired pipeline end-to-end (handler -> resolver -> plan ->
assemble) using the internal active-mode seam + the starter fragment set. This
feature owns the N-turn invariant acceptance; `handler-wiring` only smoke-tested
that a mode changes the key.

This feature does NOT change production code (test-only), and does NOT cover the
change-detection direction beyond what a negative control needs — the cache module
already owns mode-switch change-detection.

## Epic context

- Parent epic: `epic-mode-composition`
- Position in epic: **verification — depends on `handler-wiring`.** The epic's
  Invariant-1/2 load-bearing test surface; discharges the inherited
  `clean-base.test.ts` upgrade obligation.

## Foundation references

- `docs/SPEC.md` — "The three invariants" (1: full form — one identity + one copy
  of each fragment across N turns; 2: byte-identical across no-change turns with a
  mode set; the forbidden-in-output list).
- `docs/ARCHITECTURE.md` — "Where each invariant is enforced", "Components"
  (test layout).
- `tests/clean-base.test.ts`, `tests/cache-stability.test.ts` (current) — the
  predecessors this feature upgrades / extends to the mode-set case.

## Inherited / epic design decisions (do not re-litigate)

- **Upgrade `clean-base.test.ts` to full Invariant 1** (one identity + one copy of
  each fragment across N turns with a mode set) — the inherited handoff obligation.
- **clean-base upgrade lives HERE**, not in `handler-wiring` (from the epic's codex
  advisory): handler-wiring smoke-tests, this feature is the engine-level acceptance.
