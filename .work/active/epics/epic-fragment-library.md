---
id: epic-fragment-library
kind: epic
stage: done
tags: [docs, patterns]
parent: null
depends_on: [epic-mode-composition]
release_binding: v0.2.0
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

## Decomposition (realized)

Six features, refined by a codex decomposition advisory. The five content
features parallelize; `preset-bundles` depends on all of them.

- `epic-fragment-library-base-overlays` — `prompts/base/` thin overlays + `base.json`
  [prose] — depends on: `[]`
- `epic-fragment-library-agency-axis` — 4 agency fragments [prose] — depends on: `[]`
- `epic-fragment-library-quality-axis` — 3 quality fragments [prose] — depends on: `[]`
- `epic-fragment-library-scope-axis` — 3 scope fragments [prose] — depends on: `[]`
- `epic-fragment-library-modifiers` — ~11 modifier fragments [prose] — depends on: `[]`
- `epic-fragment-library-preset-bundles` — `presets.json` curated 8 (data/catalog,
  feature-design — NOT prose) — depends on:
  `[base-overlays, agency-axis, quality-axis, scope-axis, modifiers]`

### Other agent review (codex)
Accepted: the five fragment-authoring features are `[prose]` → prose-author, but
`preset-bundles` is data/catalog integration (schema + resolver existence
validation), so it routes through `feature-design`, NOT prose-author. It DEPENDS on
all five content features — `loadPresets()` validates shape only; a preset
referencing a not-yet-authored fragment fails at `setActiveMode`, so presets must
ship after the fragments. Its acceptance: every shipped preset must be
`setActiveMode`-able against the bundled tree. The `refactor` preset is renamed
**`refactor-safe`** to avoid colliding with the load-bearing `[refactor]` routing tag.

## Epic completion

All six child features are `done`. The behavioral content library + curated
preset catalog are authored against the (already-fixed) engine contract:

- 24 fragments under `prompts/`: 4 agency, 3 quality, 3 scope, 11 modifiers, and
  3 thin base overlays (chill/flow/pi-direct) + `base.json` manifest. All
  adapt-ported from `../claude-code-modes`, stripped of Claude-Code framing, fit to
  pi's transform-not-replace model, byte-stable (no dynamic text).
- `presets.json` — the curated 9 (`default` + create/explore/safe/refactor-safe/
  debug/flow/partner/muse), `flow` SPEC-canonical, `refactor`→`refactor-safe`
  (tag-clash). Every preset proven `setActiveMode`-able against the real tree.

**Content review** (fresh-context) confirmed the fragments are clean; **codex
cross-model review** confirmed the catalog references only authored fragments and
the settability acceptance test is genuine. **Verification:** typecheck clean;
200 tests green.

## Epic review record

**Verdict: Approve.** All children done and reviewed (content review + a codex
catalog-integration review). The library + catalog are coherent and load through
the engine; the settability test is the load-bearing proof. Advanced
implementing → done.
