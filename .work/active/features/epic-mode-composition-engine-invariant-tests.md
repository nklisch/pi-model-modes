---
id: epic-mode-composition-engine-invariant-tests
kind: feature
stage: done
tags: [tests]
parent: epic-mode-composition
depends_on: [epic-mode-composition-handler-wiring]
release_binding: v0.2.0
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

## Design decisions (resolved during feature-design)

Resolved under autopilot (scope `--all`). Implementation tier: OPUS. **Cross-model
design advisory skipped** per policy (mechanical test design over the now-wired
engine; the contracts are fixed). Codex reserved for the implementation review +
the autopilot completion review.

- **Upgrade `tests/clean-base.test.ts` IN PLACE** by ADDING a mode-active
  Invariant-1 group; the existing identity-only (no-mode) group stays (it still
  documents the unset case). The new group sets an active mode (fixture prompts +
  `setActiveMode`) and asserts the FULL SPEC Invariant 1: across N consecutive
  turns with the mode held constant, the assembled prompt contains **exactly one
  identity line and exactly one copy of each selected fragment** (no doubling from
  the cache), plus an `A→B→C→A` base-rotation that proves no cached-output leak
  with a mode set (each return = identity + fragments + that turn's base).
- **New `tests/engine-stability.test.ts`** for the two engine-level invariants the
  mode makes testable:
  - **Cache stability with a mode set** (Invariant 2's real workout): N
    consecutive turns with model + mode + base all constant → the returned
    `systemPrompt` is byte-identical across all N (one MISS then HITs; plus a
    forced-MISS variant resetting the result cache each turn — but NOT the
    resolver/fragment state — to prove the assembly itself is deterministic).
  - **Deterministic ordering**: the assembled output places fragments in the fixed
    SPEC order (identity → base overlay → agency → quality → scope → modifiers →
    base) and that order is reproducible across turns and independent of discovery
    iteration. Assert the relative index of each fragment's content in the output.
- **Fixture-driven, full module reset.** Both files build a temp prompts tree
  (`setFragmentRootForTesting`) and `beforeEach` reset cache + resolver + fragment
  + presets so no state leaks (and so these never perturb the isolated
  identity-only test files). Test-only production code: NONE.
- **No child stories** — two cohesive test files.

## Architectural choice

Pure-unit tests driving the wired `handleBeforeAgentStart` through the harness
with a fixture prompts tree + an explicit `ResolvedMode` set active. Byte-equality
via `toBe`; fragment-count via counting line/substring occurrences. The
complementary change-detection direction is already owned by `cache.ts`'s tests +
the resolver's signature tests — this feature owns the no-change stability + the
one-copy clean-base direction with a mode.

## Implementation Units

### Unit 1: upgrade `tests/clean-base.test.ts` (add the mode-active group)

Keep the existing `describe(... Invariant 1 (no mutation + no cached-output leak,
identity-prepended))`. ADD `describe("Invariant 1 — full form (mode set: exactly
one identity + one copy of each fragment across N turns)")`:
- `beforeEach`: reset cache+resolver+fragment+presets; build a fixture prompts
  tree (base.json + base overlay + one fragment per axis + 1-2 modifiers, each with
  a UNIQUE sentinel content string like `FRAG-agency-X`); `setFragmentRootForTesting`;
  `setActiveMode(<explicit ResolvedMode over the fixture values>)`.
- **One-copy across N turns**: run N=5 turns with the same model + base; for the
  assembled output assert `count(identityLine) === 1` and, for each selected
  fragment's sentinel content, `count(sentinel) === 1`. (Turn 1 MISS assembles;
  turns 2..N HIT and must not stack.)
- **No-leak A→B→C→A with a mode**: rotate the base; each return = `assemble(identity,
  fragments, thatBase)`; assert each reflects its own base and still exactly one
  copy of each fragment.
- Helper `countOccurrences(haystack, needle)`.

### Unit 2: new `tests/engine-stability.test.ts`

- `beforeEach`: full reset + fixture tree + `setActiveMode`.
- **Cache stability (HIT path)**: N=10 turns, identical model+mode+base → collect
  `systemPrompt`; assert all `=== returns[0]`.
- **Forced-MISS assembly determinism**: N iterations of `resetCacheForTesting()`
  (result cache only — keep resolver/fragment state) then one turn; assert all
  outputs identical (proves the splice + signature are deterministic with a mode).
- **Deterministic ordering**: one turn; assert `indexOf(identity) < indexOf(base
  overlay) < indexOf(agency) < indexOf(quality) < indexOf(scope) <
  indexOf(modifier) < indexOf(pi base)` using the sentinel contents; re-run and
  assert byte-identical (no iteration-order nondeterminism).
- **Negative control**: changing the mode (different modifier set) → different
  bytes (proves the stability assertions can observe a real change).

## Implementation Order
1. Unit 1 (clean-base upgrade), 2. Unit 2 (engine-stability). Run full suite.

## Testing
This feature IS tests. Verification = both files green + the whole suite green +
typecheck clean. No production changes.

## Risks
- **Fixture/real-root interplay** (LOW): both files use a temp fixture root, never
  the real `prompts/`, so they don't depend on the shipped starter set and can pick
  multi-modifier combos freely. Full module reset prevents leak into the isolated
  identity-only tests.
- **Stability ≠ change-detection** (BY DESIGN): this feature owns the no-change
  direction; the cache module's tests + the resolver signature tests own
  change-detection. The negative control here only proves the assertions can fail.

## Implementation notes

Landed (test-only, NO production changes):

- **Unit 1 — `tests/clean-base.test.ts` upgraded in place.** The existing
  identity-only `describe(... Invariant 1 (no mutation + no cached-output leak,
  identity-prepended))` group is UNCHANGED (still documents the unset case). Added
  a new `describe("Invariant 1 — full form (mode set: ...)")` group plus a
  `countOccurrences(haystack, needle)` helper. It builds a temp prompts tree
  (base overlay + agency/quality/scope + two modifiers `tdd`/`terse`, each with a
  unique sentinel like `FRAG-agency-autonomous`), `setActiveMode` over an explicit
  `ResolvedMode`, full module reset in `beforeEach`/`afterEach`. Two tests:
  (a) ONE-COPY across N=5 identical turns — `count(identity)===1` and
  `count(sentinel)===1` for every selected fragment on every turn (turn 1 MISS,
  turns 2..5 HIT, no stacking); (b) NO-LEAK `A→B→C→A` base rotation — each return
  carries its own base exactly once + one copy of each fragment, BASE_A turns are
  byte-identical re-assemblies, distinct bases yield distinct bytes.
- **Unit 2 — `tests/engine-stability.test.ts` (new).** Full reset + fixture tree +
  `setActiveMode` in `beforeEach`. Four tests: (a) CACHE STABILITY HIT path —
  N=10 identical turns all `=== returns[0]`; (b) FORCED-MISS DETERMINISM — N=10
  iterations of `resetCacheForTesting()` (RESULT cache only) then one turn, all
  identical (confirmed the resolver's active mode survives a cache-only reset, so
  each turn re-materializes + re-splices the same mode — verified by reading the
  modules: `resetCacheForTesting` touches only cache-module state, `activeSpec`
  lives in the resolver module); (c) DETERMINISTIC ORDERING — one turn asserts
  `indexOf(identity) < base < agency < quality < scope < modifier < pi-base` via
  sentinels, re-run from a fresh cache → byte-identical; (d) NEGATIVE CONTROL —
  swapping the modifier set (`tdd` → `terse`) yields different bytes.

**Verification:** `npm run typecheck` clean; `npm test` green —
**14 files, 178 tests** (was 172; +6: 2 new in clean-base, 4 in engine-stability).
The pre-existing clean-base identity-only group still passes.

**Invariants HOLD:** no fragment doubling and no cached-output leak (Invariant 1
full form), byte-identical assembly across no-change turns on both HIT and forced-
MISS paths (Invariant 2), and deterministic SPEC fragment ordering. No real
product bug surfaced — assertions are genuine byte/count checks, and the negative
control confirms they can observe a real change. No deviations.

## Review record

**Verdict: Approve** — cross-model codex review (peeragent, --effort high). No
findings. The Invariant-1 assertions use exact occurrence counts over unique
sentinels (a doubling bug would fail); the forced-MISS-determinism test correctly
relies on `resetCacheForTesting()` clearing only cache-module state while
`activeSpec` lives in the resolver (so it forces result-cache MISSes with the mode
active, proving assembly determinism, not HIT replay); deterministic ordering uses
distinct-sentinel `indexOf` checks + a byte-identical rerun; the negative control
is genuinely fail-able; the existing identity-only group is intact. 178 tests,
typecheck clean. Advanced review → done.
