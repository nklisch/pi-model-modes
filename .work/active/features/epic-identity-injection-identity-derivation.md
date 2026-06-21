---
id: epic-identity-injection-identity-derivation
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

# Identity Derivation + Provider Display-Name Map

## Brief

This feature delivers the identity line itself — the pure derivation that
turns `ctx.model` into `You are {model.name} from {providerDisplayName}.` —
and the plugin-owned `provider → display-name` map it depends on. It is the
identity half of what ARCHITECTURE places in `src/assemble.ts` plus the
`src/provider-names.ts` module. The derivation is a pure function of the
model object: same model in, same line out, no per-turn state, no I/O. It
must be byte-deterministic (Invariant 2) — for a given `{ name, provider }`
it always produces the identical string, turn after turn.

The provider display-name map is **folded into this feature** (not a
standalone child) because it has exactly one consumer — this derivation —
and a map plus a title-case fallback is 1-2 implementation units, well below
a feature-floor. Splitting it would manufacture a tiny feature and force a
cross-feature type seam for zero parallelism gain (nothing else consumes the
map). `Provider` is a bare string id with no display field (verified against
`@earendil-works/pi-ai` types), so the map is the source of truth and the
sole maintenance surface when providers are added.

This feature does NOT cover: splicing the identity line into the prompt
(that is the handler-integration feature's job), the cache key or change
signal (cache-and-change-signal), capability metadata in the line (deferred
per SPEC out-of-scope), or `/mode:inspect` rendering (mode-inspect). It
hands downstream a pure `deriveIdentityLine(model): string` and the
display-name lookup, nothing more.

## Epic context

- Parent epic: `epic-identity-injection`
- Position in epic: **foundation feature (identity half) — no deps.** It
  produces the derivation + provider-name map that the handler-integration
  feature (assembles the line into the prompt on a cache miss) and the
  mode-inspect feature (renders the current identity) both consume. It is
  independent of the cache-and-change-signal feature and parallelizes with
  it.

## Foundation references

- `docs/SPEC.md` — "Identity line" (the format
  `You are {model.name} from {providerDisplayName(model.provider)}.`, the
  name+provider-only scope for v1, identity prepended as the first line),
  "Integration point: `before_agent_start`" (`ctx.model` shape:
  `{ id, name, provider, contextWindow, reasoning, ... }`, read fresh every
  turn).
- `docs/ARCHITECTURE.md` — "Components" (`src/provider-names.ts`,
  `src/assemble.ts`), "Key design properties" (identity leads the prompt —
  most-stable element, longest-lived cached prefix).
- `docs/VISION.md` — "What success looks like" (model knows what it is by
  name and provider on every turn; `/model` switch updates the line next
  turn because identity is derived per turn, never cached against a stale
  snapshot).

## Inherited design decisions (from parent epic)

These are locked in the epic's `## Design decisions`; this feature inherits
them and must not re-litigate:

- **Provider display-name source**: a plugin-owned `provider → display-name`
  map in `src/provider-names.ts`, keyed on pi's `KnownProvider` union, with a
  title-case fallback (`"openai"` → `"Openai"`) for unknown/custom provider
  ids. `Provider` is a bare string id with no display field, so the map is
  the source of truth.
- **Identity format**: `You are {model.name} from {providerDisplayName}.` —
  one line. Name + provider only for v1; capability metadata deferred.
- **Always inject**: identity is injected on every turn regardless of custom
  `SYSTEM.md` / `--system-prompt`. (The *splicing* of that decision is the
  handler-integration feature; this feature only produces the line.)

<!-- The design pass on this feature (`/agile-workflow:feature-design`) fills
in the `KnownProvider` map contents, the title-case fallback behavior, the
exact `deriveIdentityLine(model)` signature, and the byte-determinism test
(derivation is pure — Invariant 2's foundation at the line level). -->
