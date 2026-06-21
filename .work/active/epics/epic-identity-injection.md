---
id: epic-identity-injection
kind: epic
stage: implementing
tags: [tests]
parent: null
depends_on: [epic-scaffold-handler]
release_binding: null
gate_origin: null
created: 2026-06-20
updated: 2026-06-21
---

# Model Identity Injection + Cache Mechanism

## Brief

This epic delivers the first user-visible feature: the model is told what it
is, by name and provider, on every turn. "You are GLM-4.6 from Zhipu AI." read
live from `ctx.model`. Switching models with `/model` updates the line on the
next turn because identity is derived per turn, never cached against a stale
snapshot.

Crucially, this epic **births the cache-key mechanism and the change-signal
ring buffer** that the rest of the plugin depends on. SPEC Invariant 2 (cache
stability) is first enforceable here: identity alone already requires the
assembled prompt to be byte-identical across turns where the model hasn't
changed. The cache key is `hash(model.id, model.provider, mode.signature,
hash(e.systemPrompt))`; with no mode yet, `mode.signature` is the empty/no-op
sentinel. The change signal records `{ previousKey, newKey, turn, reason }`
on every key replacement — this is what `/mode:inspect` (a late child feature
of this epic) reads.

The identity line leads the prompt as the very first byte — it is the most
stable element and therefore anchors the longest possible provider prefix
cache.

This epic does NOT cover capability metadata in the identity line
(context window, reasoning support — deferred to a possible future modifier),
mode composition, or fragment loading. Identity is name + provider only.

## Foundation references

- `docs/SPEC.md` — "The three invariants" (Invariant 2: cache stability),
  "Cache key and the change signal," "Identity line."
- `docs/ARCHITECTURE.md` — "Per-turn data flow" (steps 2-3, the cache hit/miss
  branch), "Cache and change signal (`src/cache.ts`)," "Key design properties"
  (identity leads the prompt).
- `docs/VISION.md` — "The problem" (gap 1: no model identity), "What success
  looks like" (model knows what it is; switching updates the line).

## Decomposition

Split by capability along the producer/consumer seams the foundation docs
already imply: two independent **foundation** features (the identity line, and
the cache+change-signal module — both pure, no deps, parallelizable), one
**integration** feature that wires them into the existing handler, one
**consumer** feature (`/mode:inspect`), and one **verification** feature (the
Invariant-2 stability test). This shape over alternatives:

- **Provider-name map folded INTO `identity-derivation`** (not standalone).
  It has exactly one consumer and is 1-2 units; a standalone feature would
  slice below the floor and force a cross-feature type seam for no
  parallelism gain.
- **Change-signal ring buffer folded INTO the cache module** (not separate,
  as the provisional sketch listed). The signal is recorded *inside* the
cache's key-replacement moment and needs the previous key the cache already
tracks; ARCHITECTURE co-locates them in `src/cache.ts`. Splitting would
force an awkward callback/event seam across two features and duplicate the
shared `lastKey` state. The combined module (~10-12 units) is within the
feature floor.
- **Handler wiring pulled OUT of the cache module** as its own
  `handler-integration` feature. Folding the handler into the cache feature
  (the sketch's "always-return-never-skip" phrasing leaned that way) would
  conflate a pure module with the orchestrator and bloat one feature to
  ~16-18 units; the cache stays a pure foundation, the handler consumes it.
- **Cache-stability test kept as its own feature** (not folded into
  handler-integration). It is a substantial, distinct verification artifact
  explicitly named in the epic sketch and ARCHITECTURE's test layout, and
  the SPEC requires each invariant to have a test — not a manufactured test
  feature.

Dependency graph is a clean DAG (cycle-checked via `work-view --blocking`):
the two foundations parallelize; `handler-integration` and `mode-inspect`
both sit on the foundations and parallelize with each other;
`cache-stability-test` depends on `handler-integration`. Critical path is
foundations → handler-integration → cache-stability-test.

### Child features

- `epic-identity-injection-identity-derivation` — the pure
  `deriveIdentityLine(model)` + the folded `src/provider-names.ts`
  display-name map (keyed on `KnownProvider`, title-case fallback) —
  depends on: `[]`
- `epic-identity-injection-cache-and-change-signal` — `src/cache.ts`:
  cache key (`hash(model.id, model.provider, mode.signature,
  hash(e.systemPrompt))`, `mode.signature` a no-op sentinel for now),
  per-turn result cache (module-scope `lastKey`/`lastResult`, hit/miss),
  change-signal ring buffer (records `{ previousKey, newKey, turn, reason,
  detail }` on key replacement), and the read API inspect consumes —
  depends on: `[]`
- `epic-identity-injection-handler-integration` — rewires `src/handler.ts`
  from no-op to cache-aware identity injection: compute key, hit→return
  `lastResult`, miss→derive identity + assemble (identity leads) + store +
  record change; preserves the always-return /
  `RequiredBeforeAgentStartResult` contract through both paths; evolves the
  predecessor's `noop.test.ts` byte-identity assertion — depends on:
  `[epic-identity-injection-identity-derivation,
  epic-identity-injection-cache-and-change-signal]`
- `epic-identity-injection-mode-inspect` — registers `/mode:inspect`,
  renders plain text (minimal `Mode:` line for v1, identity, last-change
  reason/detail + turn offset, cache key) from the cache read API +
  identity derivation — depends on:
  `[epic-identity-injection-cache-and-change-signal,
  epic-identity-injection-identity-derivation]`
- `epic-identity-injection-cache-stability-test` — `tests/cache-stability.test.ts`,
  the load-bearing Invariant-2 enforcement: byte-identical returned
  `systemPrompt` across N no-change turns (stable model + no mode + stable
  base) — depends on: `[epic-identity-injection-handler-integration]`

### Decomposition risks

- **Invariant-3 scaffolding test breaks on landing (cross-epic test
  evolution).** The predecessor's `tests/noop.test.ts` asserts the return is
  byte-identical to the input. This epic's locked "always inject identity"
  decision makes that false — identity is prepended every turn even with no
  mode. `handler-integration` must EVOLVE that assertion (byte-identity →
  identity-prepended, remainder byte-identical), not preserve it; this is
  test-debt evolution per the project's test-integrity rules, not a product
  bug. If missed, the build breaks the moment handler-integration lands.
  Mitigation: flagged in the `handler-integration` brief's inherited-decisions
  and implementation-notes hook.
- **The cache key MUST include `hash(e.systemPrompt)`** — and the
  stability test alone cannot prove it. `cache-stability-test` holds pi's
  base constant, so it verifies the no-change direction only; a base change
  (date rollover, tool/skill change) that failed to invalidate the key would
  serve a stale prompt and the stability test would still pass. Mitigation:
  the `cache-and-change-signal` feature's own tests must cover the
  change-detection direction (each of model/mode/base flipping → key changes
  → re-assemble); the two directions are complementary, split across the
  cache module's tests (change-detection) and the epic's stability test
  (no-change stability).
- **Identity must LEAD the prompt, and always-return must survive the
  cache.** If `handler-integration` appends identity at the tail, prefix-cache
  stability is destroyed (ARCHITECTURE: identity is the first byte, the
  longest-lived prefix). Separately, the cache hit path must never surface an
  uninitialized `lastResult` — a hit is impossible before the first miss
  populates state, and that invariant is the cache module's to guarantee.
  Mitigation: both are called out in the respective briefs as inherited
  contracts; `handler-integration`'s design verifies identity-leading and
  always-return through both hit and miss paths.

## Handoff obligations

- **Roll `docs/SPEC.md` + `docs/ARCHITECTURE.md` forward when identity lands.**
  The locked decision "always inject identity" means Invariant 3 is no longer
  literally "returns `e.systemPrompt` unchanged" — it becomes "returns
  `e.systemPrompt` with identity prepended; NO mode fragments when unset."
  The roll-forward is OWNED by `epic-identity-injection-handler-integration`
  (its body carries the explicit codex-consult requirement). Flagged at epic
  level so it survives child rework. (From codex decomposition review.)

## Design decisions

- **Identity injection scope**: ALWAYS inject the identity line, even when
  the user has a custom `SYSTEM.md` or passes `--system-prompt`. Identity is
  purely additive — prepended as the first line, never overriding or removing
  the user's custom content. The model knowing what it is applies regardless
  of who authored the prompt body.
- **Provider display-name source**: Ship a plugin-owned
  `provider → display-name` map in `src/provider-names.ts`, keyed on pi's
  `KnownProvider` union, with a title-case fallback (`"openai"` → `"Openai"`)
  for unknown/custom provider ids. `Provider` is a bare string id with no
  display field (verified in `@earendil-works/pi-ai` types), so there is
  nothing to derive at runtime — the map is the source of truth and the
  maintenance surface.
- **Identity format**: `You are {model.name} from {providerDisplayName}.` —
  one line, leads the prompt (most-stable element, longest-lived cached
  prefix per ARCHITECTURE). Name + provider only for v1; capability metadata
  deferred (per SPEC out-of-scope).
- **`/mode:inspect` output**: Plain text rendered to the message stream
  (not a custom editor-replacing UI overlay) for v1 — reads the change-signal
  ring buffer; format per ARCHITECTURE's example block. (Folded into this
  epic per the epicize decision — it consumes only this epic's change signal.)
