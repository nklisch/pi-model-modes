---
id: epic-mode-composition
kind: epic
stage: drafting
tags: [tests, refactor]
parent: null
depends_on: [epic-scaffold-handler]
release_binding: null
gate_origin: null
created: 2026-06-20
updated: 2026-06-20
---

# Mode Composition Engine

## Brief

This epic delivers the behavioral core: a mode resolves to a fragment set and
splices deterministically into pi's assembled prompt. A mode is
`base + agency + quality + scope + {modifiers}`; presets bundle known-good
combinations into a single name.

The engine fixes the contract that `epic-fragment-library` (content) and
`epic-switching-paths` (selection) both build against — so those two can be
fanned out in parallel once this epic lands. The contract: given a resolved
mode signature, the engine produces a fixed, deterministic splice order
(identity → base overlay → agency → quality → scope → modifiers → pi's
`e.systemPrompt`), reading fragments through a module-scope cache.

`mode.signature` enters the cache key alongside `model.id`, `model.provider`,
and `hash(e.systemPrompt)` — so a mode switch is the other thing (besides a
model switch) that forces a re-assemble. This is where SPEC Invariant 2 gets
its real workout: the engine must produce byte-identical output across turns
where neither the model nor the mode changed, with no dynamic text and
ordered-array-only fragment sequencing.

This epic does NOT author the ~40 fragment markdown files (that's
`epic-fragment-library`) and does NOT expose mode selection to the user
(that's `epic-switching-paths`). It ships the resolver, the assembler, the
fragment-cache loader, and the preset table — exercised against a minimal
starter set of fragments (one per type) sufficient to test the engine.

## Foundation references

- `docs/SPEC.md` — "The three invariants" (Invariant 1: clean-base handling —
  splice always sources from `e.systemPrompt`; Invariant 2: cache stability —
  no dynamic text, ordered arrays only), "Cache key and the change signal,"
  "Mode composition," "Out of scope for v1."
- `docs/ARCHITECTURE.md` — "Components" (`src/resolver.ts`, `src/assemble.ts`,
  `src/fragments.ts`, `src/presets.ts`), "Per-turn data flow" (steps 4-7,
  the cache-miss path), "Fragment library," "Where each invariant is enforced."
- `docs/VISION.md` — "What this is" (composable modes: base + three axes +
  modifiers; presets).

## Anticipated child features

- `feature-mode-resolver` — resolve a mode id/preset to
  `{ base, agency, quality, scope, modifiers[] }`; the `mode.signature` string.
- `feature-fragment-loader` — read fragments once, cache trimmed content in a
  module-scope `Map<path, string>`; survives mode switches.
- `feature-deterministic-splice` — assemble identity + base + axes + modifiers
  + `e.systemPrompt` in fixed order; ordered arrays only, no `Set` iteration.
- `feature-preset-table` — `presets.json` schema and loader; selecting a preset
  selects all components atomically.
- `feature-engine-invariant-tests` — clean-base (exactly one copy of each
  fragment across N turns), cache-stability with a mode set, deterministic
  ordering.

<!-- The design pass on each child feature fills in real specifics.
Do not treat these as commitments. -->
