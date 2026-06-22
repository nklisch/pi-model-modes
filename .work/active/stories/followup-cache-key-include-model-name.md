---
id: followup-cache-key-include-model-name
kind: story
stage: done
tags: [tests]
parent: null
depends_on: []
release_binding: v0.2.0
gate_origin: tests
created: 2026-06-21
updated: 2026-06-21
review_origin: epic-identity-injection-handler-integration
---

# Cache Key Must Include model.name (Invariant 2 bug)

## Source

Codex design consult of `epic-identity-injection-handler-integration` on
2026-06-21. The cache key omits `model.name` even though
`deriveIdentityLine(model)` uses `model.name` for the identity line.

## The bug

`computeCacheKey` inputs are `{ modelId, modelProvider, modeSignature,
baseSystemPrompt }`. The handler caches the assembled prompt, which includes
the identity line `You are {model.name} from {providerDisplayName}.`.

If `model.name` changes while `model.id` + `model.provider` + base + mode
stay stable, the cache key does NOT change → **HIT** → the stale identity
line (with the old `model.name`) is returned. This violates SPEC Invariant 2
(byte-identical output across no-change turns — the inverse: a changed
identity must invalidate).

Realistic trigger: a provider updates a model's display name in the registry
without changing its id (e.g. `"GLM-4.6"` → `"GLM-4.7"` keeping id
`glm-4.6`, or any registry-side rename). Less likely but possible: two
distinct models sharing an id string across providers (already covered by
provider, but name is the human-facing field the identity line reads).

## The fix

Add `modelName: string` to `CacheKeyInputs` + `KeyComponents` in `src/cache.ts`.
Thread it through:

- `componentsOf(inputs)` → add `modelName: inputs.modelName`
- `encodeComponents(components)` → include `modelName` in the
  length-delimited encoding (preserves the cross-field-ambiquity guarantee)
- `classifyReason(prev, next)` → a `modelName` change classifies as
  `model-switched` (same priority bucket as id/provider — it's a model
  identity change)
- `ChangeSignalEntry.detail` → include `modelName: {from, to}` alongside
  modelId/modelProvider

Update `src/cache.ts` tests: add a `modelName`-change invalidation test
(different name, same id/provider/base/mode → different key + MISS +
`model-switched` reason). Add to the simultaneous-change priority coverage.

## Consumers to update

- `epic-identity-injection-handler-integration` (in-flight) — its handler
  builds `CacheKeyInputs` from `ctx.model`; must pass `modelName:
  ctx.model?.name ?? ""`. The handler's design has been updated to reflect
  this.
- `docs/SPEC.md` "Cache key and the change signal" — the key formula becomes
  `hash(model.name, model.id, model.provider, mode.signature,
  hash(e.systemPrompt))`. Rolled forward as part of handler-integration's
  doc roll-forward.

## Priority

High — this is a latent Invariant 2 correctness bug. The fix is small
(additive field threading). Ship alongside or before handler-integration so
the done cache feature doesn't ship a known correctness gap into the
backbone.

## Sizing

One stride: extend `CacheKeyInputs`/`KeyComponents`/`componentsOf`/
`encodeComponents`/`classifyReason`/detail + 1-2 new tests + update the
handler's key construction + SPEC formula. ~6-8 units.


## Gate implementation notes (2026-06-22)

Implemented by threading `modelName` through `CacheKeyInputs`, `KeyComponents`, canonical encoding, reason classification, change-signal detail, and the handler key construction. Added cache and handler tests for name-only invalidation.

Verification: `npm run typecheck`; `npm test` (371/371).
