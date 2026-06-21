---
id: epic-fragment-library
kind: epic
stage: drafting
tags: [docs, patterns]
parent: null
depends_on: [epic-mode-composition]
release_binding: null
gate_origin: null
created: 2026-06-20
updated: 2026-06-20
---

# Fragment Library + Presets

## Brief

This epic authors the behavioral content the engine splices: the ~40 markdown
fragments across bases, the three axes, and modifiers, plus the named preset
bundles. It is content authoring against an engine contract already fixed by
`epic-mode-composition` — which is why it can run in parallel with
`epic-switching-paths` once the engine lands.

The fragment layout mirrors the composition model:

- `prompts/base/` — voice overlays (not skeletons); a `base.json` manifest
  declares slot order. Default base is pi's own (passthrough, no file).
- `prompts/axis/{agency,quality,scope}/` — one file per value. Agency:
  `autonomous | collaborative | surgical | partner`. Quality:
  `architect | pragmatic | minimal`. Scope: `unrestricted | adjacent | narrow`.
- `prompts/modifiers/` — `bold, tdd, debug, flow, muse, readonly, methodical,
  director, speak-plain, context-pacing, playful`.
- `presets.json` — named bundles (e.g. `flow = base:chill + agency:autonomous +
  scope:adjacent + modifier:flow`).

Implementation ordering within this epic: ship a **starter set** first (one
fragment per type, enough to exercise every engine code path), then fill out
the full catalog. The starter set unblocks end-to-end testing of the engine
without waiting on the full ~40 files.

This epic does NOT change the engine contract, the resolver, or the cache. It
feeds the engine files to read. Each fragment is a single concern — one
behavioral brief in the voice established during the ideate/design passes
(grounded in `../claude-code-modes` as the style reference, adapted to pi's
transform-not-replace model).

## Foundation references

- `docs/SPEC.md` — "Mode composition" (the full axis/modifier value lists,
  assembly order), "Out of scope for v1."
- `docs/ARCHITECTURE.md` — "Components" (the `prompts/` tree), "Fragment
  library" (base/axis/modifier layer descriptions, module-scope cache).
- `docs/VISION.md` — "What this is" (composable modes; transform-not-replace),
  "What this is not" (bases are overlays, not skeleton replacements).

## Anticipated child features

- `feature-base-overlays` — `prompts/base/` voice overlays + `base.json`
  manifest; at minimum a `chill`/`flow`-style overlay alongside the pi-default
  passthrough.
- `feature-agency-axis` — four agency fragments.
- `feature-quality-axis` — three quality fragments.
- `feature-scope-axis` — three scope fragments.
- `feature-modifiers` — the ~11 modifier fragments.
- `feature-preset-bundles` — `presets.json` with the named combinations
  (`create`, `flow`, `explore`, `safe`, etc., adapted from the reference
  plugin's preset table).

<!-- The design pass on each child feature fills in real specifics.
Do not treat these as commitments. -->

## Design decisions

- **Voice and source**: Adapt-port from `../claude-code-modes`. Port the
  proven fragment bodies, adapting them to pi's transform-not-replace model
  and stripping Claude-Code-specific framing (tool lists, "Claude Code"
  self-references, CC-specific mechanics). The creative adaptation work is
  the base overlays — the reference's bases are full skeletons, ours are
  thin overlays (next decision), so base content is written fresh in the
  overlay voice rather than ported verbatim.
- **Base overlay semantics**: Thin tone-setter. A base overlay is ONE short
  paragraph that shifts register and emphasis (e.g. calm pacing for `chill`,
  calm-plus-engaged for `flow`). It does NOT restate tools, identity, or
  context — pi owns all of that. This is the minimal form that respects
  transform-not-replace and avoids redundancy against pi's assembled content.
- **Preset set (v1)**: Curated 8 presets — `{ create, explore, safe, refactor,
  debug, flow, partner, muse }`. Director dropped; `muse`, `flow`, `partner`
  explicitly included. Each preset maps to
  `{ base, agency, quality, scope, modifiers[] }` (concrete axis/modifier
  assignments resolved at feature-design time). The remainder of the
  reference's ~14 presets can land in a later pass.

## Decomposition risks

- **`refactor` preset vs `[refactor]` tag name clash.** The preset named
  `refactor` (a disposition bundle) shares its name with the `[refactor]`
  routing tag (behavior-preserving structural change → `refactor-design`).
  The feature-design pass should either rename the preset (e.g.
  `refactor-safe`) or confirm the coexistence is intentional and documented.
  Not blocking; surfaced for the design pass.
