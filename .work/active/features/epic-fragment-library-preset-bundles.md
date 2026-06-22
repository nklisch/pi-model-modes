---
id: epic-fragment-library-preset-bundles
kind: feature
stage: done
tags: []
parent: epic-fragment-library
depends_on: [epic-fragment-library-base-overlays, epic-fragment-library-agency-axis, epic-fragment-library-quality-axis, epic-fragment-library-scope-axis, epic-fragment-library-modifiers]
release_binding: v0.2.0
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

## Design decisions (resolved during feature-design)

Resolved under autopilot (scope `--all`). Implementation tier: OPUS. Routes via
feature-design (data/catalog + validation surface, NOT prose). Codex reserved for
the implementation review.

- **Catalog = the curated 8 + a neutral `default` (9 total).** The epic locked the
  curated 8 `{ create, explore, safe, refactor-safe, debug, flow, partner, muse }`
  (with `refactor` → **`refactor-safe`** for the `[refactor]` tag-clash). We ALSO
  keep a neutral `default` preset: it is the natural target for the config
  `defaultMode` tier (config-default) and the starter `default` is referenced by
  the landed preset-table + config tests. Keeping it is additive (not a
  re-litigation of the curated dispositions) and avoids gratuitous cross-feature
  test churn. Rationale logged.
- **Concrete preset mappings** (each references only authored fragments — bases
  `pi`/`chill`/`flow`; all axes; the 11 modifiers):
  - `default`        — base:pi,   agency:autonomous,    quality:pragmatic, scope:adjacent,     modifiers:[]
  - `create`         — base:flow, agency:autonomous,    quality:architect, scope:unrestricted, modifiers:[bold]
  - `explore`        — base:flow, agency:autonomous,    quality:pragmatic, scope:unrestricted, modifiers:[muse]
  - `safe`           — base:pi,   agency:surgical,      quality:pragmatic, scope:narrow,       modifiers:[readonly]
  - `refactor-safe`  — base:pi,   agency:collaborative, quality:architect, scope:adjacent,     modifiers:[methodical]
  - `debug`          — base:pi,   agency:autonomous,    quality:pragmatic, scope:adjacent,     modifiers:[debug]
  - `flow`           — base:chill,agency:autonomous,    quality:pragmatic, scope:adjacent,     modifiers:[flow]  (SPEC-canonical example)
  - `partner`        — base:pi,   agency:partner,       quality:architect, scope:adjacent,     modifiers:[]
  - `muse`           — base:flow, agency:collaborative, quality:pragmatic, scope:unrestricted, modifiers:[muse, playful]
- **Cross-feature test roll-forward** (rolling-foundation): `tests/presets.test.ts`
  asserts the REAL `presets.json` via `getPreset("flow")` / `getPreset("default")`
  and the available-names message — roll these forward to the curated catalog
  (flow's values change to base:chill…; the keys list becomes the 9; the
  unknown-preset message lists them). The SYNTHETIC `{ json }` fixture tests are
  unaffected. Verify `tests/config.test.ts` (`defaultMode:"default"`) still passes
  (the neutral `default` exists and resolves against its fixture tree).
- **No child stories** — one data file + test roll-forward + a settability test.

## Architectural choice
Pure data authoring against the landed `preset-table` schema + `mode-resolver`'s
set-time validation. No new code module — extend `presets.json`; the validation is
already owned by `loadPresets` (shape) + the resolver (fragment existence). The new
test is the **catalog-integration acceptance**: every shipped preset must
`setActiveMode`-resolve against the REAL `prompts/` tree.

## Implementation Units

### Unit 1: `presets.json` — the curated catalog
Replace the starter `{ default, flow }` with the 9 presets above (exact mappings).
Each `{ base, agency, quality, scope, modifiers[] }`. Valid JSON object, no dup keys.

### Unit 2: `tests/presets.test.ts` — roll forward real-file assertions
- `getPreset("flow")` → the curated flow (`base:"chill"`, `agency:"autonomous"`,
  `quality:"pragmatic"`, `scope:"adjacent"`, `modifiers:["flow"]`).
- `getPreset("default")` → the neutral default mapping.
- keys-list / available-names assertions → the 9 names.
- Leave the synthetic-`{json}` shape/dup/validation tests unchanged.

### Unit 3: `tests/preset-catalog.test.ts` (new) — settability acceptance
The codex-required acceptance: with the REAL `prompts/` root (no override),
`loadPresets()` then for EVERY preset name: `setActiveMode(name)` does NOT throw
and `resolveActiveModePlan()` returns a plan whose `mode` matches and whose
`fragments` resolve (every referenced base/axis/modifier exists). Reset
resolver+presets+fragment caches in `beforeEach`. This is the load-bearing proof
that the catalog references only authored fragments.

## Acceptance criteria
- [ ] `presets.json` ships the 9 presets with the exact mappings; valid JSON.
- [ ] Every preset is `setActiveMode`-able against the real `prompts/` tree (no
  missing/ambiguous-fragment error); `resolveActiveModePlan()` succeeds for each.
- [ ] `flow` matches the SPEC-canonical example (base:chill + autonomous + adjacent
  + modifier:flow).
- [ ] `refactor-safe` (not `refactor`) — tag-clash avoided.
- [ ] preset-table real-file tests rolled forward; synthetic tests unchanged;
  config tests still pass.
- [ ] typecheck clean; full suite green.

## Risks
- **Cross-feature test reconciliation** (managed): only the REAL-file assertions in
  preset-table tests change; synthetic fixtures + config tests stay green (verify).
- **A preset referencing a misspelled value** would fail the settability test
  (Unit 3) — which is exactly its purpose (catch a broken catalog at build time).

## Implementation notes

Shipped all three units. No mapping corrections were needed — every value in the
design's 9-preset table references an authored fragment.

- **Unit 1 — `presets.json`**: replaced the starter `{ default, flow }` with the
  curated 9 (`default, create, explore, safe, refactor-safe, debug, flow,
  partner, muse`), each exactly per the design's mappings table. Valid JSON, no
  duplicate keys. Confirmed every referenced fragment exists under `prompts/`:
  - bases: `pi` (no-overlay sentinel), `chill`, `flow` (`prompts/base/chill.md`,
    `prompts/base/flow.md` present);
  - agency: `autonomous`, `collaborative`, `partner`, `surgical` (all present);
  - quality: `architect`, `pragmatic` (present);
  - scope: `adjacent`, `narrow`, `unrestricted` (all present);
  - modifiers: `bold`, `muse`, `readonly`, `methodical`, `debug`, `flow`,
    `playful` (all present in `prompts/modifiers/`).
  - `flow` is SPEC-canonical: `base:chill / autonomous / pragmatic / adjacent /
    modifiers:[flow]`.

- **Unit 2 — `tests/presets.test.ts`**: rolled forward ONLY the real-file
  assertions. `getPreset("flow")` now expects the curated chill/autonomous/
  pragmatic/adjacent/[flow] object; the two keys-list assertions
  (starter-set-sanity + memoization-reset) now expect the 9 sorted names; the
  unknown-preset available-names assertion additionally asserts `refactor-safe`.
  `getPreset("default")` and the `base:'pi'` distinction tests were untouched
  (the neutral `default` mapping is unchanged). All synthetic-`{json}` shape/dup/
  validation tests untouched.

- **Unit 3 — `tests/preset-catalog.test.ts` (new)**: the settability acceptance.
  Runs against the REAL bundled `prompts/` tree (no fragment-root override;
  `resetFragmentCacheForTesting()` in `beforeEach` restores the package-relative
  default root). `loadPresets()`, then for EVERY preset name: `setActiveMode(name)`
  does not throw, `resolveActiveModePlan()` returns a plan whose `mode` matches the
  preset's base/agency/quality/scope, every planned fragment has a non-empty path
  + loaded content, the three axes are always present, a non-`pi` base contributes
  a base overlay, and every declared modifier contributes a fragment. This is the
  load-bearing proof the catalog references only authored fragments.

**Verification**: `npm run typecheck` clean; `npm test` green — 200 tests / 17
files (was 199; net +1 from the new catalog test, with the rolled-forward preset
assertions edited in place). `tests/config.test.ts` stays green — it uses its own
fragment fixture and references only the unchanged `default` preset.

**Every preset settable confirmed**: Unit 3 materializes all 9 presets against the
real `prompts/` tree with zero missing/ambiguous-fragment errors.

## Review record

**Verdict: Approve** — cross-model codex review (peeragent, --effort high). No
findings. The 9-preset catalog is valid (no dup keys), references only authored
fragments, keeps `pi` as the no-overlay sentinel, makes `flow` SPEC-canonical, and
uses `refactor-safe`. The settability test genuinely materializes every preset
against the real `prompts/` tree (a misspelled value would throw). The preset-table
real-file assertions rolled forward without weakening the synthetic validation
tests; config tests unaffected. 200 tests green. Advanced review → done.
