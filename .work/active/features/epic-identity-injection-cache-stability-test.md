---
id: epic-identity-injection-cache-stability-test
kind: feature
stage: review
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

## Design decisions

Resolved under autopilot delegation (scope `--all`). Implementation tier: **OPUS**.
**Cross-model design advisory skipped** — per the advisory-review policy, this is
small, low-risk, mechanical test design (one test file, no architectural choice,
fully determined by the landed handler + cache). The codex budget is reserved for
the larger sibling designs and the final completion review.

- **N = 10 turns.** Enough to expose drift (a turn counter or accumulating
  state would diverge within a handful of turns); cheap to run. Not a magic
  number — any N ≥ 3 works; 10 is a comfortable margin.
- **Two complementary stability assertions, not one.**
  1. **HIT-path stability** (the realistic flow): reset once, run N turns with
     identical inputs. Turn 1 is a MISS that assembles + stores; turns 2..N are
     HITs returning the cached bytes. Assert all N returns are byte-identical.
  2. **Forced-MISS determinism** (the load-bearing direction): reset the cache
     *before each* of N turns so every turn re-assembles from scratch, then
     assert all N re-assembled outputs are byte-identical. This is what actually
     catches nondeterminism in assembly (a timestamp, turn counter, random id,
     or unordered-iteration leak) — the HIT path alone is near-tautological
     because the cache just replays a stored string.
- **Exact-bytes assertion, not just self-equality.** Assert the stable output
  equals exactly `${deriveIdentityLine(model)}\n${base}` — proving not only that
  the bytes are stable but that NOTHING dynamic (timestamp/counter) was injected
  in the first place. Self-equality across turns + an exact-shape anchor together
  close the "stably wrong" gap.
- **Negative control (guards the test itself).** A separate assertion flips one
  input across two reset sub-sequences (model A vs model B; base X vs base Y) and
  asserts the bytes DO differ. This proves the byte-comparison would actually
  catch a change — a stability test that can't fail on a real change is worthless.
  Kept as its own `it(...)`, never interleaved into the stability checks.
- **No harness extension, no child stories.** `makeEvent`, `makeContext({model})`,
  `makeModel`, `resetCacheForTesting` already exist. One cohesive test file; the
  feature IS the unit.

## Architectural choice

A single pure-unit test file driving the real `handleBeforeAgentStart` through
the existing harness with synthetic events — no live pi session. Byte-stability
is checked by direct `toBe` comparison across the collected returns (best
failure diff), anchored to the exact expected shape.

## Implementation Units

### Unit 1: `tests/cache-stability.test.ts`

**File**: `tests/cache-stability.test.ts` (new). Imports: `handleBeforeAgentStart`
from `../src/handler.js`, `deriveIdentityLine` from `../src/identity.js`,
`resetCacheForTesting` from `../src/cache.js`, `makeEvent / makeContext /
makeModel` from `./harness.js`. `beforeEach(() => resetCacheForTesting())`.

```ts
const N = 10;
const model = makeModel({ name: "GLM-4.6", provider: "zai" });
const base =
  "You are an expert coding assistant operating inside pi.\n\n" +
  "Available tools:\n- read\n- bash\n\n<project_context>...</project_context>";
const expected = `${deriveIdentityLine(model)}\n${base}`;
```

- **`it("returns byte-identical systemPrompt across N no-change turns (HIT path)")`**
  — reset once (via `beforeEach`); run N turns with the same
  `makeEvent(base)` + `makeContext({ model })`; collect `r.systemPrompt`; assert
  every element `=== expected` (and therefore `=== returns[0]`).
- **`it("re-assembles byte-identically when forced to MISS every turn (assembly determinism)")`**
  — loop N times: `resetCacheForTesting()` then run one turn; collect bytes;
  assert all `=== expected`. Catches any nondeterministic value in the assembled
  prompt (the real Invariant-2 risk).
- **`it("produces no dynamic content — output is exactly identity + base, nothing appended")`**
  — single turn; assert `r.systemPrompt === expected` and that it contains no
  extra trailing/leading bytes (length check `=== expected.length`).
- **`it("negative control: a real input change DOES change the bytes")`**
  — reset → model A bytes; reset → model B (`anthropic`/different name) bytes;
  assert `!==`. Reset → base X bytes; reset → base Y bytes; assert `!==`. Proves
  the comparison can fail on a real change.

## Implementation Order

1. Unit 1 — the single test file. Run `npm test` (full suite) + `npm run
   typecheck`. One OPUS stride.

## Testing

This feature IS tests. Verification = the new file passing plus the whole suite
staying green. No production code changes, so no risk of regressing other
features; the only dependency is the landed `handleBeforeAgentStart` (done).

## Risks

- **HIT-path test is near-tautological** on its own (the cache replays a stored
  string). Mitigated by the forced-MISS determinism test (the load-bearing one)
  + the exact-shape anchor; the HIT test still documents the realistic flow.
- **`cache-stability` cannot prove base-change invalidation** (it holds base
  constant) — by design. That direction is owned by `cache-and-change-signal`'s
  change-detection tests (done). The negative control here only proves the test
  *can* observe a change, not that the handler invalidates on a base change in
  production (that is the sibling's contract). Documented so the split is clear.

## Implementation notes

Landed `tests/cache-stability.test.ts` exactly per Unit 1 — one cohesive
test file, no production-code changes, no harness extension, no child stories.

- **Imports** (ESM/NodeNext `.js`): `handleBeforeAgentStart` from
  `../src/handler.js`, `deriveIdentityLine` from `../src/identity.js`,
  `resetCacheForTesting` from `../src/cache.js`, `makeEvent` / `makeContext` /
  `makeModel` from `./harness.js`.
- **Fixtures**: `N = 10`; `model = makeModel({ name: "GLM-4.6", provider:
  "zai" })`; the multi-line `base`; `expected = ${deriveIdentityLine(model)}\n${base}`.
- **`beforeEach(() => resetCacheForTesting())`** for isolation; the
  forced-MISS and negative-control tests reset explicitly inside their
  loops/sub-sequences.
- A small local `runTurn(b, m)` helper drives one real
  `handleBeforeAgentStart` call through the harness and returns `systemPrompt`.

Four `it(...)` blocks, all four assertions confirmed passing:
1. **HIT-path stability** — N turns, all `=== expected` (+ `Set` size 1).
2. **Forced-MISS determinism** (load-bearing) — `resetCacheForTesting()`
   before each of N turns, all re-assembled outputs `=== expected`.
3. **No dynamic content** — single turn `=== expected` AND
   `length === expected.length` (nothing appended).
4. **Negative control** — model A vs model B (`anthropic`, different name)
   bytes `!==`; base X vs base Y bytes `!==`. Kept as its own `it`, never
   interleaved with stability checks.

**Verification** (both run, both clean):
- `npm run typecheck` (`tsc --noEmit`): clean, no errors.
- `npm test` (`vitest --run`): **76 passed** (7 files) — 72 prior + 4 new.
  No prior tests regressed (test-only addition).

**Rationale logged** (autopilot judgment): negative-control base-change fixture
appends `\n\n<extra>changed</extra>` to `base` (a real, observable byte change
through the same assembly path); model-B uses `{ name: "Claude", provider:
"anthropic" }` so both the name and provider differ from model A, exercising the
identity line's full divergence. Stability genuinely holds — no Invariant-2
violation observed; no blocker.
