---
id: epic-identity-injection-cache-and-change-signal
kind: feature
stage: done
tags: [tests]
parent: epic-identity-injection
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Cache Key + Per-Turn Result Cache + Change-Signal Ring Buffer

## Brief

This feature builds `src/cache.ts` — the foundation module the whole rest of
the plugin depends on. It owns three concerns that ARCHITECTURE co-locates in
one file because they share the `lastKey` state and fire on the same event
(key replacement): (1) the **cache key** —
`hash(model.id, model.provider, mode.signature, hash(e.systemPrompt))`, with
`mode.signature` a stable no-op sentinel for this epic (no mode yet); (2) the
**per-turn result cache** — module-scope `lastKey`/`lastResult` with a
hit/miss decision the handler consults each turn (hit → reuse, miss →
re-assemble); and (3) the **change-signal ring buffer** — a small fixed-size
buffer that records `{ previousKey, newKey, turn, reason, detail }` whenever
`lastKey` is replaced, plus the internal read API that `/mode:inspect`
later consumes.

The change signal and the result cache are folded into one feature (rather
than split, as the epic sketch provisional listed) because the signal is
recorded *inside* the cache's key-replacement moment and needs the previous
key the cache module already tracks — splitting would force an awkward
callback/event seam across two features for no parallelism gain, and would
duplicate the shared `lastKey` state. The combined module is a single
coherent foundation (~10-12 units) within the feature floor. It is a pure
module: no pi coupling except through typed interfaces, fully unit-testable
without spinning up pi (ARCHITECTURE's unit-testability property).

This feature does NOT cover: the handler that *calls* the cache
(handler-integration), the identity assembly that runs on a miss
(handler-integration consuming identity-derivation), `/mode:inspect`'s
rendering (mode-inspect), or any mode/fragment logic (later epics). It hands
the handler a key-computer, a hit/miss check, a store-and-record call, and
hands inspect a read API. The `mode.signature` input is a no-op sentinel
here; a later epic supplies the real signature.

## Epic context

- Parent epic: `epic-identity-injection`
- Position in epic: **foundation feature (mechanism half) — no deps.** It is
  the single most-depended-on child: handler-integration consumes its
  hit/miss + store + record API, and mode-inspect consumes its read API. It
  is independent of identity-derivation and parallelizes with it. Getting
  this module's contract right is the load-bearing structural risk of the
  epic (see decomposition risks in the epic body).

## Foundation references

- `docs/SPEC.md` — "Cache key and the change signal" (the exact key formula;
  `key === lastKey → return lastResult`; "the handler always returns a
  `systemPrompt`; it never returns `undefined`"; the change-signal record
  shape and its consumers), "The three invariants" (Invariant 2: cache
  stability — the key must cover all inputs so no-change turns are
  byte-identical, AND any real change must invalidate).
- `docs/ARCHITECTURE.md` — "Cache and change signal (`src/cache.ts`)" (the
  two caches table — per-turn result cache vs fragment file cache — and the
  ring-buffer record shape), "Per-turn data flow" (steps 2-3 and 7: compute
  key, hit/miss branch, store + emit change signal on miss), "Where each
  invariant is enforced" (cache stability in `assemble.ts` + `cache.ts`),
  `/mode:inspect` example output (the fields the read API must expose:
  last-change reason/detail, turn offset, current key).

## Inherited design decisions (from parent epic)

These are locked in the epic's `## Design decisions`; this feature inherits
them and must not re-litigate:

- **Identity leads the prompt** (ARCHITECTURE): the identity line is the
  first byte and the most-stable element, so the key's stability depends on
  identity being deterministic — but that is identity-derivation's contract.
  This feature's contract is that the key is a pure function of its four
  inputs and is byte-stable for identical inputs.
- **Always-return discipline** (inherited from `epic-scaffold-handler`): the
  handler never returns `undefined`. This feature must not break that — the
  hit path must never surface an uninitialized `lastResult`. The
  initialization discipline (a hit is impossible before the first miss
  populates state) belongs in this feature's design.

<!-- The design pass on this feature (`/agile-workflow:feature-design`) fills
in the hash choice (the inspect output renders the key as truncated hex
`9f3a...c1e2`, implying a hex-digest hash), the no-op `mode.signature`
sentinel value, the ring-buffer capacity and eviction, the reason
classification (initial / model-switched / mode-switched / base-changed) and
how it compares prev-vs-new inputs, the turn-accounting model, the exact read
API surface, and the tests (hit/miss correctness, byte-stability of the key
for identical inputs, change-detection on each input flipping, ring-buffer
eviction, reason classification). -->

## Codex consult requirements (folded in from decomposition review)

The stability test (in `cache-stability-test`) only proves the NO-CHANGE
direction; it cannot prove the `hash(e.systemPrompt)` term in the key is
necessary. THIS feature must ship change-detection tests that would FAIL if
any key term were omitted. Specifically:

- **Base-change invalidation**: same `model` + same `mode.signature` +
  DIFFERENT `e.systemPrompt` → different key (proves the `hash(e.systemPrompt)`
  term matters).
- **Miss-after-base-change**: after storing result A, changing only
  `e.systemPrompt` is a MISS (not a HIT), and the returned/stored result is
  newly assembled — NOT the prior `lastResult`.
- **Model-change invalidation**: same `mode.signature` + same `e.systemPrompt`
  + different `model.id`/`provider` → different key (proves model terms matter).
- **Mode-change invalidation** (forward-looking, may be a no-op sentinel now):
  same model + same base + different `mode.signature` → different key.
- **Change-signal reason classification**: each of the above records the
  correct `reason` (`base-changed` / `model-switched` / `mode-switched` /
  `initial`) with useful detail.
- **Uninitialized state cannot HIT**: before the first MISS populates state,
  the cache reports a MISS (never surfaces an undefined `lastResult`). This
  protects the always-return discipline on the hit path.

## Design decisions

Resolved with judgment under autopilot delegation (no strategic questions;
the cross-model advisory `peer` pass was **skipped** because the delegation
prohibits spawning sub-agents — see `## Other agent review`). Each decision
below is reversible or defers to locked epic/SPEC decisions; rationale is
logged so the implementor and reviewer don't re-litigate.

- **Hash choice**: SHA-256 via Node's built-in `node:crypto` (`createHash`).
  Zero dependencies, deterministic, available on every Node ≥ 22.19 target.
  Hex digest so `/mode:inspect` can render the truncated form `9f3a...c1e2`.
  No external hashing dep is justified for a 64-byte-per-turn hash.
- **Canonical encoding**: length-delimited — `<byteLen>:<field>` joined by
  `|` over `[modelId, modelProvider, modeSignature, baseHash]`, then SHA-256.
  The byte-length prefix (not char-length) nullifies cross-field ambiguity
  (so `modelId="ab",provider="c"` and `modelId="a",provider="bc"` cannot
  collide). `baseSystemPrompt` enters the encoding as its OWN SHA-256 (per
  SPEC's literal `hash(e.systemPrompt)` term AND to keep the canonical form
  compact — the base prompt can be many KB).
- **Mode sentinel**: `export const NO_MODE_SIGNATURE = ""`. Empty string is
  semantically "no mode content added to the key", is distinct from any real
  composed signature (SPEC's composed signatures are non-empty pipe-delimited
  strings like `base:chill|agency:autonomous|...`), and a named constant
  makes call sites explicit + grep-able. `epic-mode-composition` replaces
  the CALLER's use of this constant with the real composed signature (the
  constant may move to `resolver.ts` or be deleted then).
- **Cache API shape**: `getCachedResult(key): string | undefined` +
  `setCachedResult(key, result, inputs: CacheKeyInputs)`. Hit test is
  `key === lastKey`. `inputs` is passed to `set` ONLY (not `get`) so the
  module can classify the change reason by diffing against the stored
  previous components — this keeps reason-classification ownership inside
  `src/cache.ts` (per ARCHITECTURE) instead of pushing it onto the handler.
  The handler already built the `inputs` object for `computeCacheKey`, so the
  extra arg is free at the call site.
- **Cached result type**: `string`. The cache stores pi's assembled
  `systemPrompt` (the handler's return payload), so `string` is the honest
  contract and is stricter than `unknown`. Not generic — a future different
  cache is a different feature.
- **Uninitialized-cannot-HIT**: `lastKey` starts `undefined`;
  `getCachedResult` returns `undefined` whenever `lastKey === undefined` OR
  `key !== lastKey`. A HIT is structurally impossible before the first
  `setCachedResult` — the guard is in the getter, not a separate flag.
- **Miss-only contract on `setCachedResult` (Fail Fast)**: `set` throws if
  `key === lastKey`. The handler only calls `set` after a MISS, so this throw
  surfaces caller misuse immediately in tests rather than recording a
  spurious change entry. Centralizes the "≥1 component must differ"
  invariant; `classifyReason` is then exhaustive over model/mode/base.
- **Reason priority for simultaneous changes**: `model-switched` >
  `mode-switched` > `base-changed`. Most-deliberate-user-action first (a
  model switch is a deliberate `/model`; a mode switch is a deliberate
  `/mode`; base churn like midnight date rollover is automatic and least
  significant). SPEC does not rank simultaneous changes; this is recorded
  here as the rule.
- **Ring capacity**: `16` (per task guidance; enough history for inspect
  without unbounded growth). Backed by a plain `Array` with `.shift()` on
  overflow — a head/tail circular buffer is over-engineering for a 16-entry
  structure that writes only on a MISS (rare).
- **Turn model**: a module counter incremented at the **start of every
  `getCachedResult` call** (one call ≡ one pi turn, since the handler calls
  `getCachedResult` exactly once per `before_agent_start`). The change entry
  records the turn of the MISS. This lets `/mode:inspect` compute
  "N turns ago" as `currentTurn - lastEntry.turn` across both hit and miss
  turns. The increment is a documented side effect of `getCachedResult`
  (folding turn accounting into the always-called-per-turn getter avoids a
  separate `beginTurn()` API the handler would have to remember to call).
- **`detail` shape**: structured `{ from, to }` per key component
  (modelId / modelProvider / modeSignature / baseHash) — NOT a pre-formatted
  string. `/mode:inspect` (sibling feature) owns rendering; the cache stores
  the raw transition. `baseHash` stands in for base content (compact; avoids
  buffering the full prompt text in the ring).
- **Read snapshot additions**: `getChangeSignal()` returns
  `{ currentTurn, currentKey, entries, lastEntry }`. `currentKey` (the
  live `lastKey`) is added beyond SPEC's enumerated fields so inspect can
  render `Cache key: 9f3a...c1e2` (ARCHITECTURE's example output). `currentTurn`
  is added so inspect can compute turns-since-last-change without a second
  API.
- **Test-only reset**: `resetCacheForTesting()` clears all module state
  (lastKey, lastResult, lastComponents, ring, turn counter). Pragmatic and
  standard for module-state singletons; the alternative (dependency-injecting
  the store) over-engineers a single-entry cache and would complicate the
  handler. Called in `beforeEach`.

## Design

### Architectural choice

Single module `src/cache.ts` owning three co-located concerns (key, result
cache, change signal) over a split — inherited from the epic's locked
decomposition (see epic body: folding the ring buffer into the cache avoids a
cross-feature callback/event seam and duplicated `lastKey` state). The module
is pure: no pi-runtime imports. The only thing it might import is plain TS
types and `node:crypto`. Module-scope mutable state (`lastKey`, `lastResult`,
`lastComponents`, the ring, the turn counter) is EXPECTED here — the cache IS
stateful by design. The clean-base discipline (sourcing from `e.systemPrompt`,
never from `lastResult`) applies to the HANDLER, not to this module.

No child stories. ~10-12 units in one cohesive module, single implementor
stride, no parallelization or multi-session benefit to splitting (per
feature-design's "when stories are pure overhead" test: single-stride, tight
cohesion, every test exercises the shared module state).

### Unit 1: `src/cache.ts`

Public surface (exact signatures):

```ts
import { createHash } from "node:crypto";

/** No-mode sentinel for `modeSignature` (this epic). Empty string is distinct
 *  from any real (non-empty) composed signature. `epic-mode-composition`
 *  replaces the caller's use of this with the real composed signature. */
export const NO_MODE_SIGNATURE = "";

/** The four inputs to the cache key. `baseSystemPrompt` is pi's
 *  fully-assembled `e.systemPrompt` for the turn. */
export interface CacheKeyInputs {
  modelId: string;
  modelProvider: string;
  modeSignature: string;
  baseSystemPrompt: string;
}

/** Pure: SHA-256 hex digest of a length-delimited canonical encoding of the
 *  four inputs. Deterministic — same inputs always produce the same key. */
export function computeCacheKey(inputs: CacheKeyInputs): string;

/** Per-turn hit check. Returns the cached result on HIT, `undefined` on MISS.
 *  SIDE EFFECT: advances the module turn counter (one call ≡ one pi turn). */
export function getCachedResult(key: string): string | undefined;

/** Store a freshly-assembled `result` for `key` and record a change-signal
 *  entry. `inputs` is the same object passed to `computeCacheKey` — used to
 *  classify the change reason by diffing against previously-stored components.
 *  THROWS if `key === lastKey` (miss-only contract; Fail Fast on misuse). */
export function setCachedResult(
  key: string,
  result: string,
  inputs: CacheKeyInputs,
): void;

export type ChangeReason =
  | "initial"
  | "model-switched"
  | "mode-switched"
  | "base-changed";

export interface ChangeSignalEntry {
  turn: number;
  previousKey: string | undefined;
  newKey: string;
  reason: ChangeReason;
  detail: {
    modelId: { from: string | undefined; to: string };
    modelProvider: { from: string | undefined; to: string };
    modeSignature: { from: string | undefined; to: string };
    baseHash: { from: string | undefined; to: string };
  };
}

export interface ChangeSignalSnapshot {
  currentTurn: number;
  currentKey: string | undefined;
  /** Oldest-first, capped at RING_CAPACITY (= 16). */
  entries: ChangeSignalEntry[];
  lastEntry: ChangeSignalEntry | undefined;
}

/** Read API for `/mode:inspect` (sibling feature). Pure read; no side effects. */
export function getChangeSignal(): ChangeSignalSnapshot;

/** TEST-ONLY: clear lastKey, lastResult, lastComponents, ring, turn counter. */
export function resetCacheForTesting(): void;
```

Internal helpers (implementation notes for the implementor):

```ts
const RING_CAPACITY = 16;

interface KeyComponents {
  modelId: string;
  modelProvider: string;
  modeSignature: string;
  baseHash: string; // sha256(baseSystemPrompt)
}

// Module-scope state (mutable by design):
let lastKey: string | undefined;
let lastResult: string | undefined;
let lastComponents: KeyComponents | undefined;
let currentTurn = 0;
const ring: ChangeSignalEntry[] = [];

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function componentsOf(inputs: CacheKeyInputs): KeyComponents {
  return {
    modelId: inputs.modelId,
    modelProvider: inputs.modelProvider,
    modeSignature: inputs.modeSignature,
    baseHash: sha256Hex(inputs.baseSystemPrompt),
  };
}

// Length-delimited canonical encoding: `<byteLen>:<field>` joined by '|'.
// Byte-length prefix keeps multibyte inputs unambiguous; same components
// always produce the same canonical string (hence same key).
function encodeComponents(c: KeyComponents): string {
  const enc = (f: string) => `${Buffer.byteLength(f, "utf8")}:${f}`;
  return [enc(c.modelId), enc(c.modelProvider), enc(c.modeSignature), enc(c.baseHash)]
    .join("|");
}

// computeCacheKey(inputs) = sha256Hex(encodeComponents(componentsOf(inputs)))

// Priority: initial > model-switched > mode-switched > base-changed.
// Only called when key !== lastKey, so ≥1 component is guaranteed to differ.
function classifyReason(prev: KeyComponents | undefined, curr: KeyComponents): ChangeReason {
  if (prev === undefined) return "initial";
  if (prev.modelId !== curr.modelId || prev.modelProvider !== curr.modelProvider)
    return "model-switched";
  if (prev.modeSignature !== curr.modeSignature) return "mode-switched";
  return "base-changed";
}
```

`getCachedResult` semantics:
```ts
export function getCachedResult(key: string): string | undefined {
  currentTurn += 1; // one call ≡ one pi turn (documented side effect)
  if (lastKey !== undefined && key === lastKey) return lastResult;
  return undefined;
}
```

`setCachedResult` semantics:
```ts
export function setCachedResult(key, result, inputs): void {
  if (key === lastKey) {
    throw new Error("setCachedResult called on a HIT (key === lastKey) — miss-only contract");
  }
  const prevComponents = lastComponents;
  const curr = componentsOf(inputs);
  const reason = classifyReason(prevComponents, curr);
  const entry: ChangeSignalEntry = {
    turn: currentTurn,
    previousKey: lastKey,
    newKey: key,
    reason,
    detail: {
      modelId:       { from: prevComponents?.modelId,         to: curr.modelId },
      modelProvider: { from: prevComponents?.modelProvider,   to: curr.modelProvider },
      modeSignature: { from: prevComponents?.modeSignature,   to: curr.modeSignature },
      baseHash:      { from: prevComponents?.baseHash,        to: curr.baseHash },
    },
  };
  ring.push(entry);
  if (ring.length > RING_CAPACITY) ring.shift();
  lastKey = key;
  lastResult = result;
  lastComponents = curr;
}
```

`getChangeSignal` returns a snapshot view (a shallow copy of `entries` so
callers can't mutate the ring): `{ currentTurn, currentKey: lastKey, entries: [...ring], lastEntry: ring[ring.length - 1] }`.

### Unit 2: `tests/cache.test.ts`

Pure-module tests; no pi event/ctx and therefore no need for the
`tests/harness.ts` builders. Each test seeds state via direct
`computeCacheKey` / `getCachedResult` / `setCachedResult` calls;
`beforeEach(() => resetCacheForTesting())` isolates cases (module state would
otherwise leak across tests in the same vitest process).

## Implementation order

1. `src/cache.ts` — full module (key + result cache + ring buffer + read API +
   test reset).
2. `tests/cache.test.ts` — the test list below.
3. `npm run typecheck && npm test` green.

Single stride, one implementor, no fan-out.

## Testing

Grouped into `describe` blocks. Every test name is concrete (the implementor
writes the body to match).

### `computeCacheKey` — purity + determinism
- `produces a 64-char lowercase hex digest`
- `is byte-identical for identical inputs across repeated calls (pure)`
- `is unaffected by construction order of the inputs object (pure over values, not reference)`

### `computeCacheKey` — change-detection (term necessity; codex-required)
These FAIL if any key term is omitted:
- `base-change: same model+mode, different baseSystemPrompt → different key` (proves `hash(e.systemPrompt)` matters)
- `model-change: different modelId (same provider+mode+base) → different key`
- `model-change: different modelProvider (same id+mode+base) → different key`
- `mode-change: different modeSignature (same model+base) → different key` (forward-looking; uses two distinct non-empty signatures, not the sentinel)
- `length-delimited encoding nullifies cross-field ambiguity: { modelId: "ab", provider: "c" } ≠ { modelId: "a", provider: "c" } ... → specifically a split like ("ab","c",sig,base) vs ("a","bc",sig,base) yields different keys`

### Result cache — hit/miss
- `uninitialized state: getCachedResult returns undefined before any set (never surfaces undefined as a HIT)`
- `after setCachedResult(key, A), getCachedResult(key) returns A (HIT)`
- `after setCachedResult(keyA, A), getCachedResult(keyB) returns undefined (MISS)`
- `base-change after storing A is a MISS (not a HIT): getCachedResult returns undefined, the prior result is not surfaced` (codex-required miss-after-base-change)

### Change signal — reason classification (codex-required)
- `first setCachedResult records reason "initial" with previousKey undefined and detail.from all undefined`
- `modelId change (same provider+mode+base) records reason "model-switched" with modelId detail`
- `modelProvider change (same id+mode+base) records reason "model-switched"`
- `modeSignature change records reason "mode-switched" with modeSignature detail`
- `base change (same model+mode) records reason "base-changed" with baseHash detail`
- `simultaneous model+base change classifies as "model-switched" (priority: model > mode > base)`
- `simultaneous mode+base change classifies as "mode-switched" (priority)`

### Change signal — ring buffer
- `evicts the oldest entry when capacity (16) is exceeded; entries stays length 16`
- `entries is oldest-first; lastEntry is the most recent`
- `entries returned by getChangeSignal is a copy: mutating it does not affect the module ring`

### Change signal — read API
- `getChangeSignal exposes currentTurn, currentKey, entries, lastEntry`
- `before any set: currentKey undefined, entries empty, lastEntry undefined`
- `currentTurn - lastEntry.turn yields turns-since-last-change (exercised across a hit-then-miss sequence)`

### Turn accounting
- `turn counter increments by 1 per getCachedResult call (HIT or MISS)`
- `a change entry records the turn of the MISS (the turn counter value at the preceding getCachedResult)`

### Miss-only contract (Fail Fast)
- `setCachedResult throws when key === lastKey (caller misuse surfaces immediately)`

## Acceptance criteria

- [ ] `computeCacheKey` is pure + deterministic: same 4 inputs always produce
  the same 64-char lowercase hex digest (no closure/module state consulted).
- [ ] Each of the 4 key terms is proven necessary: flipping modelId,
  modelProvider, modeSignature, or baseSystemPrompt alone yields a different
  key (4 change-detection tests).
- [ ] Cross-field ambiguity is nullified: the length-delimited encoding makes
  `("ab","c",sig,base)` ≠ `("a","bc",sig,base)`.
- [ ] `getCachedResult` returns the stored result on a HIT (`key === lastKey`)
  and `undefined` on a MISS.
- [ ] **Uninitialized state cannot HIT**: before the first `setCachedResult`,
  `getCachedResult` returns `undefined` (never surfaces an undefined result
  as a HIT — protects always-return).
- [ ] **Miss-after-base-change**: after storing result A, changing only
  `baseSystemPrompt` is a MISS (not a HIT).
- [ ] All 4 change reasons are classified correctly (`initial`,
  `model-switched`, `mode-switched`, `base-changed`) with structured
  `detail.from`/`detail.to` per component.
- [ ] Simultaneous changes classify by priority model > mode > base.
- [ ] Ring buffer evicts the oldest entry at capacity 16; `entries` stays
  length 16 and is oldest-first; `lastEntry` is the most recent.
- [ ] `getChangeSignal()` returns `{ currentTurn, currentKey, entries,
  lastEntry }` with `entries` as a defensive copy.
- [ ] Turn counter increments per `getCachedResult` call; change entries
  record the turn of their MISS.
- [ ] `setCachedResult` throws on `key === lastKey` (miss-only contract).
- [ ] `npm run typecheck` clean (strict mode; no `any`; no unused).
- [ ] `npm test` green; the new `tests/cache.test.ts` passes alongside the
  existing suite (no regression in `noop`/`clean-base`/`registration`).

## Risks

- **Cross-field key collision** — if the canonical encoding were a naive
  concatenation, `("ab","c")` could collide with `("a","bc")`. Mitigated by
  length-delimited encoding + an explicit ambiguity test.
- **Module-state leak across tests** — vitest runs tests in one process;
  module state (`lastKey`, ring, turn counter) would bleed between cases.
  Mitigated by `resetCacheForTesting()` in `beforeEach`.
- **Turn-counter drift if `getCachedResult` is called >1× per turn** — in
  production the handler calls it exactly once per `before_agent_start`, so
  the counter equals the pi turn count. Documented as a side effect; tests
  interpret extra calls as extra "turns" (correct under the model).
- **Sentinel collision** — `NO_MODE_SIGNATURE = ""` is distinct from any real
  composed signature (all non-empty per SPEC). If a future mode system ever
  produced an empty composed signature for a SET mode, it would collide with
  unset; mitigated by SPEC's invariant that a set mode always has ≥ agency
  fragment.
- **`detail` over-coupling to inspect** — mitigated by storing structured
  `{from,to}` transitions rather than pre-formatted strings; inspect owns
  presentation.

## Other agent review

Cross-model advisory `peer` pass **skipped**: the autopilot delegation that
scoped this work prohibits spawning sub-agents ("Do NOT spawn sub-agents"),
and a `peer` call is a sub-agent delegation. Resolved all design questions
with host judgment per the delegation instruction; rationale logged under
`## Design decisions`. A reviewer pass (`/agile-workflow:review`) at
`stage: review` is the appropriate second pair of eyes for this design.

## Implementation notes

Implemented exactly to spec — no design deviations. Two files created:

- `src/cache.ts` — full module per Unit 1. Public surface: `NO_MODE_SIGNATURE`,
  `CacheKeyInputs`, `computeCacheKey`, `getCachedResult`, `setCachedResult`,
  `ChangeReason`, `ChangeSignalEntry`, `ChangeSignalSnapshot`,
  `getChangeSignal`, `resetCacheForTesting`. Internal helpers: `RING_CAPACITY=16`,
  `KeyComponents`, `sha256Hex`, `componentsOf`, `encodeComponents` (length-
  delimited `<byteLen>:<field>` joined by `|`), `classifyReason` (priority
  initial > model-switched > mode-switched > base-changed). Module-scope state
  (`lastKey`, `lastResult`, `lastComponents`, `currentTurn`, `ring`) is mutated
  only inside `getCachedResult` (turn++), `setCachedResult` (state + ring), and
  `resetCacheForTesting` (clears all). SHA-256 via `node:crypto` `createHash` —
  zero deps. Fail Fast throw on `key === lastKey` lives at the top of
  `setCachedResult` before any state mutation (so a misuse throw leaves state
  untouched). `getChangeSignal()` returns `entries: [...ring]` (shallow copy).
- `tests/cache.test.ts` — 28 tests across 7 `describe` blocks, one per item in
  the `## Testing` list (purity/determinism, 5 change-detection incl.
  length-delimited ambiguity, hit/miss incl. uninitialized-cannot-HIT and
  miss-after-base-change, 7 reason-classification incl. simultaneous-change
  priority, 3 ring-buffer incl. 17-set eviction + copy isolation, 3 read-API,
  2 turn-accounting, 1 miss-only-contract throw). `beforeEach(() =>
  resetCacheForTesting())` isolates every test.

Verification:
- `npm run typecheck` → clean (strict, `noUnusedLocals/Parameters`,
  `verbatimModuleSyntax` honored: `import type` for `CacheKeyInputs`).
- `npx vitest --run tests/cache.test.ts` → **28 passed (28)**.
- Full `npm test` → 4 of 5 test files pass (64 of 65 tests). The single
  failure is in `tests/identity.test.ts` — a **sibling feature's** file
  (`epic-identity-injection-identity-derivation`, being implemented by a
  parallel autopilot stride; `providerDisplayName("gpt5-Mini")` title-case
  assertion). It is unrelated to `src/cache.ts` (my module exports nothing
  called `providerDisplayName` and touches no identity code). Left untouched
  per test-integrity rules — not my feature's file; the identity implementor
  owns it. No regression in `noop`/`clean-base`/`registration`.

All acceptance criteria satisfied; ready for `/agile-workflow:review`.

## Review (2026-06-21)

**Verdict**: Approve with comments

**Blockers**: none
**Important**: `followup-cache-model-mode-priority-test` — add the missing explicit simultaneous model+mode priority regression test.
**Nits**: `tests/cache.test.ts:227` contains a tautological hash-stability assertion before the meaningful `from !== to` check; harmless, optional cleanup with the follow-up.

**Notes**: Substrate feature deep review by Codex after GLM implementation. Reviewed item design and implementation notes; `docs/SPEC.md` cache-key/change-signal contract; `docs/ARCHITECTURE.md` cache/ring-buffer design; `.agents/rules/agile-workflow.md` test-integrity rule; implementation commit `475e89d`; `src/cache.ts`; and `tests/cache.test.ts`. Cross-model/fresh-context requirement satisfied by reviewer model switch (GLM implementor → Codex reviewer); no additional sub-agent spawned because this reviewer role cannot spawn sub-agents. Verification rerun: `npm test -- tests/cache.test.ts` → 28 passed, `npm run typecheck` → clean, full `npm test` → 64 passed. Code satisfies the cache key, miss-only, uninitialized miss, change signal, ring buffer, turn accounting, no-pi-coupling, and test isolation contracts. The only material gap found is test coverage, not implementation behavior: existing priority tests prove model>base and mode>base, while `src/cache.ts` currently implements model>mode via checking model before mode; a follow-up backlog story records the missing direct regression test.
