---
id: epic-identity-injection
kind: epic
stage: drafting
tags: [tests]
parent: null
depends_on: [epic-scaffold-handler]
release_binding: null
gate_origin: null
created: 2026-06-20
updated: 2026-06-20
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

## Anticipated child features

- `feature-identity-derivation` — derive `You are {name} from {provider}` from
  `ctx.model`; the provider→display-name map.
- `feature-cache-key-and-result-cache` — the per-turn result cache (key
  composition, always-return-never-skip, module-scope `lastKey`/`lastResult`).
- `feature-change-signal-ring-buffer` — record key diffs with reason; the
  internal read API `/mode:inspect` later consumes.
- `feature-mode-inspect-command` — `/mode:inspect` rendering mode, identity,
  last-change reason, cache key from the ring buffer. (Folded in per epicize
  decision — it depends only on this epic's change signal, not on modes.)
- `feature-cache-stability-test` — hash `ctx.getSystemPrompt()` across N
  no-change turns; assert byte-equality. The load-bearing Invariant 2 test.

<!-- The design pass on each child feature fills in real specifics.
Do not treat these as commitments. -->

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
