---
id: epic-mode-composition-preset-table
kind: feature
stage: drafting
tags: [tests]
parent: epic-mode-composition
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Preset Table — ResolvedMode type + presets.json schema/loader

## Brief

This feature delivers `src/presets.ts` and `presets.json`: the preset table that
bundles known-good component combinations under a single name, plus the shared
`ResolvedMode` selection type the rest of the engine builds against. A preset is
`{ base, agency, quality, scope, modifiers[] }`; selecting a preset selects all
components atomically. This feature owns the **`ResolvedMode` contract** (the
type `mode-resolver` produces and `deterministic-splice` consumes) and the
loader/validator for `presets.json`.

A central representational decision lands here: **`base: "pi"`** is the explicit
default sentinel meaning "pi's own voice, no base overlay" — distinct from
`NO_MODE_SIGNATURE = ""` (which means no mode at all). A resolved mode with
`base: "pi"` is still a real mode with a non-empty signature; it simply contributes
no base-overlay fragment to the splice.

This feature does NOT resolve precedence or compute the signature (that is
`mode-resolver`), does NOT load fragment content (that is `fragment-loader`), and
ships only a minimal starter `presets.json` (a couple of presets over the starter
fragment set) — the full preset catalog rides with later content work.

## Epic context

- Parent epic: `epic-mode-composition`
- Position in epic: **foundation — no deps; defines the `ResolvedMode` type
  `mode-resolver` and `deterministic-splice` depend on.** Parallelizes with
  `fragment-loader`.

## Foundation references

- `docs/SPEC.md` — "Mode composition" (`mode = base + agency + quality + scope +
  {modifiers}`; preset = named bundle; base default = pi's own).
- `docs/ARCHITECTURE.md` — "Components" (`src/presets.ts`, `presets.json` named
  bundles).

## Inherited / epic design decisions (do not re-litigate)

- **Preset selects atomically**: a preset name expands to all five components.
- **`base: "pi"` default sentinel**, distinct from `NO_MODE_SIGNATURE = ""`
  (resolved in the epic's codex advisory).
- **Validation fail-fast** (this feature's slice): unknown preset name, duplicate
  preset ids, or a preset referencing an undefined axis value fails fast.
