---
id: epic-identity-injection-cache-stability-test
kind: feature
stage: drafting
tags: [tests]
parent: epic-identity-injection
depends_on: [epic-identity-injection-handler-integration]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Cache Stability Test — Invariant 2 (byte-identical across no-change turns)

## Brief

This feature delivers `tests/cache-stability.test.ts` — the load-bearing
SPEC Invariant 2 enforcement: across N consecutive turns in which the model
has not changed, the (effective no-)mode has not changed, and pi's own base
has not changed, the handler's returned `systemPrompt` is byte-identical.
The test invokes the handler repeatedly through the test harness with stable
inputs, hashes (or byte-compares) the returned `systemPrompt` across the
sequence, and asserts equality. Any drift — a timestamp, a turn counter, a
nondeterministic value, Set-iteration ordering — fails the build. This is
the test that makes the cache key's stability guarantee load-bearing rather
than aspirational.

It is the full form of Invariant 2 first enforceable in this epic (the
scaffolding epic could only enforce Invariants 1 and 3; with no assembly
there was nothing whose stability to assert across turns). It is kept as its
own feature rather than folded into handler-integration because it is a
substantial, distinct verification artifact (N-turn simulation +
byte-equality under controlled-stable inputs) explicitly named in the epic
sketch and the ARCHITECTURE test layout, and folding it would push
handler-integration past the feature unit ceiling. It is not a manufactured
test feature — the SPEC requires that each invariant has a test, and this is
that test.

This feature does NOT cover: the handler logic (handler-integration), the
cache module (cache-and-change-signal), or the change-detection direction
(that a real input change *does* invalidate — the cache-and-change-signal
feature owns change-detection tests; this feature owns the no-change
stability direction). The two directions are complementary: stability holds
across no-change turns, invalidation fires on any real change.

## Epic context

- Parent epic: `epic-identity-injection`
- Position in epic: **verification of the assembled pipeline — depends on
  handler-integration.** It tests the handler's returned bytes, so the full
  identity+cache pipeline must be wired first. It is independent of
  mode-inspect and parallelizes with it. It is the epic's Invariant-2
  load-bearing test surface.

## Foundation references

- `docs/SPEC.md` — "The three invariants" (Invariant 2: cache stability —
  byte-identical across no-change turns; the forbidden-in-output list:
  timestamps, turn counters, random IDs, unordered-iteration ordering),
  "Cache key and the change signal" (why stability holds — the key covers
  all inputs).
- `docs/ARCHITECTURE.md` — "Components" (`tests/cache-stability.test.ts` in
  the test layout), "Where each invariant is enforced" (cache stability in
  `assemble.ts` + `cache.ts` — this test is what enforces it), "Per-turn data
  flow" (the hit path returns `lastResult` unchanged, which is the mechanism
  stability relies on).
- `tests/harness.ts` (current) — the `makeEvent`/`makeContext`/`makePi`
  builders this test extends (supplying a stable `ctx.model` across the N
  turns via `makeContext` overrides).

## Inherited design decisions (from parent epic)

These are locked in the epic's `## Design decisions`; this feature inherits
them and must not re-litigate:

- **Test framework**: `vitest` (`vitest --run`); pure-unit tests against the
  handler with synthetic events — no live pi session required.
- **Always-inject identity**: the stable bytes asserted across turns
  *include* the identity line (identity is injected every turn, so it is
  part of the byte-stable prefix — and it is stable because
  identity-derivation is pure and `ctx.model` is held constant across the N
  turns).

<!-- The design pass on this feature (`/agile-workflow:feature-design`) fills
in the N value, the exact stable-input fixtures (a fixed `ctx.model`, a
fixed `e.systemPrompt`, no mode), the byte-equality assertion (hash or
direct compare across the N returned prompts), a negative control if useful
(flipping one input between two sub-sequences and asserting the bytes *do*
change there — guarded as a separate assertion, not a pollution of the
stability check), and any harness extension needed to drive N turns. -->
