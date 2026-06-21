---
id: epic-identity-injection-cache-and-change-signal
kind: feature
stage: drafting
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
