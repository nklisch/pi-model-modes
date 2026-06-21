---
id: epic-fragment-library-preset-bundles
kind: feature
stage: drafting
tags: []
parent: epic-fragment-library
depends_on: [epic-fragment-library-base-overlays, epic-fragment-library-agency-axis, epic-fragment-library-quality-axis, epic-fragment-library-scope-axis, epic-fragment-library-modifiers]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Preset Bundles (presets.json catalog)

## Brief

This feature fills out the `presets.json` catalog: the curated **8** presets
`{ create, explore, safe, refactor-safe, debug, flow, partner, muse }` (the
epic's `refactor` preset is **renamed `refactor-safe`** to avoid colliding with
the load-bearing `[refactor]` routing tag — codex decomposition advisory). Each
preset maps to `{ base, agency, quality, scope, modifiers[] }` over the authored
fragment set.

This is NOT pure prose — it is **data/catalog integration** against
`preset-table`'s `presets.json` schema + the resolver's set-time existence
validation. `loadPresets()` validates SHAPE only; a preset that references a
fragment that does not exist fails later at `setActiveMode`. So this feature
**depends on every content feature** (base-overlays + all three axes + modifiers)
so its presets reference real, authored files — and its acceptance includes that
**every shipped preset is settable via `setActiveMode(name)` against the bundled
prompt tree** (resolves with no missing-fragment error).

This feature routes through `feature-design` (data + validation surface), not
prose-author. It extends the existing starter `presets.json` (shipped by
`preset-table`) to the full curated set.

## Epic context
- Parent epic: `epic-fragment-library`
- Position: **catalog integration — depends on all five content features.**

## Foundation references
- `docs/SPEC.md` — "Mode composition" (preset = named bundle).
- `src/presets.ts` (landed) — `loadPresets`/`getPreset` + the `presets.json`
  schema this extends; `src/resolver.ts` — set-time existence validation.

## Inherited / epic design decisions (do not re-litigate)
- **Curated 8 presets**; `refactor` → **`refactor-safe`** (tag-clash avoidance).
- **Depends on the authored fragments** (presets must reference real files).
- Acceptance: every preset `setActiveMode`-able against the bundled tree.
