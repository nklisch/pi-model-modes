---
id: epic-identity-injection-handler-integration
kind: feature
stage: drafting
tags: [tests]
parent: epic-identity-injection
depends_on: [epic-identity-injection-identity-derivation, epic-identity-injection-cache-and-change-signal]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Handler Integration — Identity Injection + Cache Wiring

## Brief

This feature rewires `src/handler.ts` from the no-op form (`{ systemPrompt:
e.systemPrompt }`) into the identity-injecting, cache-aware form that is the
per-turn data flow's heart (ARCHITECTURE steps 2-8, minus mode fragments).
On each call it computes the cache key, consults the result cache: on a HIT
it returns `lastResult` unchanged; on a MISS it derives the identity line
(via identity-derivation), assembles `identity + e.systemPrompt` (identity
prepended as the first byte — the most-stable element, anchoring the longest
cached prefix), stores the new `lastKey`/`lastResult`, records the change
signal, and returns. The **always-return discipline** inherited from
`epic-scaffold-handler` must survive both paths: HIT and MISS both return a
present `systemPrompt`, never `undefined`, preserving the strict
`RequiredBeforeAgentStartResult` compile-time contract.

This is the integration child — it consumes the two foundation features and
produces the user-visible behavior the epic is named for (the model is told
what it is, every turn, and switching `/model` updates the line next turn
because identity is derived per turn off live `ctx.model`, never cached
against a stale snapshot). It also evolves a predecessor test: the
scaffolding-form Invariant 3 assertion in `tests/noop.test.ts` (return ===
input, byte-for-byte) can no longer hold once identity is always prepended;
that test's assertion drifts from "byte-identical" to "identity prepended,
remainder byte-identical" (test-debt evolution per the project's
test-integrity rules, not a product bug).

This feature does NOT cover: the identity derivation itself
(identity-derivation), the cache key or change signal (cache-and-change-signal),
mode fragments (later epics — no mode yet, so assembly is identity + pi base
only), or `/mode:inspect` (mode-inspect). It is the orchestrator that wires
the two foundations into the existing handler and updates the predecessor's
tests to match the new always-inject reality.

## Epic context

- Parent epic: `epic-identity-injection`
- Position in epic: **integration / consumer of both foundations.** It
  depends on identity-derivation (for the miss-path line) and
  cache-and-change-signal (for the key + hit/miss + store + record). It is
  the load-bearing user-visible child: the cache-stability test depends on
  it (tests its assembled output), and it produces the `lastResult`/identity
  that mode-inspect ultimately surfaces.

## Foundation references

- `docs/SPEC.md` — "Integration point: `before_agent_start`" (handler
  signature, return contract), "Cache key and the change signal" (the
  hit/miss branch and the never-`undefined` rule), "Identity line"
  (prepended as the first line), "The three invariants" (Invariant 1
  clean-base — splice sources from `e.systemPrompt` never from `lastResult`;
  note Invariant 3's scaffolding form evolves here since identity is now
  always injected).
- `docs/ARCHITECTURE.md` — "Per-turn data flow" (steps 2-8: compute key,
  hit→return lastResult, miss→derive identity, assemble, store, emit change
  signal, return), "Where each invariant is enforced" (clean-base in
  `assemble.ts` — splice from `e.systemPrompt`; no-op-unset in `handler.ts`),
  "Key design properties" (identity leads; the cache key is the only thing
  that decides work).
- `src/handler.ts` (current) — the no-op form being extended; the strict
  `RequiredBeforeAgentStartResult` return type and the always-return
  contract established by `epic-scaffold-handler` must be preserved.
- `tests/noop.test.ts`, `tests/clean-base.test.ts` (current) — predecessor
  tests this feature evolves (noop's byte-identity assertion; clean-base's
  no-mutation/no-cache-leak assertions carry forward unchanged in spirit).

## Inherited design decisions (from parent epic)

These are locked in the epic's `## Design decisions`; this feature inherits
them and must not re-litigate:

- **Always inject identity**: the identity line is prepended on every turn,
  even with no mode selected and even with a custom `SYSTEM.md` /
  `--system-prompt`. Identity is purely additive — prepended as the first
  line, never overriding or removing the user's content.
- **Identity format / placement**: `You are {model.name} from
  {providerDisplayName}.` as the very first byte (longest-lived cached
  prefix).
- **Always-return contract** (from `epic-scaffold-handler`): the handler
  ALWAYS returns `{ systemPrompt }`, never `undefined`, on both the cache
  hit and miss paths. The strict `RequiredBeforeAgentStartResult` return
  type stays.

<!-- The design pass on this feature (`/agile-workflow:feature-design`) fills
in the exact handler rewrite (rename `_ctx`→`ctx` to read `ctx.model`; wire
the cache miss/hit; assemble identity-leading splice), the evolution of
`tests/noop.test.ts` (byte-identity → identity-prepended remainder
byte-identity), any new handler tests (identity presence + correctness;
always-return through both paths; hit returns the prior miss's bytes), and
confirms clean-base still holds (splice sources from `e.systemPrompt`, never
`lastResult`). -->
