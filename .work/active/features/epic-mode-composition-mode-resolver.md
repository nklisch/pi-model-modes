---
id: epic-mode-composition-mode-resolver
kind: feature
stage: drafting
tags: [tests]
parent: epic-mode-composition
depends_on: [epic-mode-composition-fragment-loader, epic-mode-composition-preset-table]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Mode Resolver — specifier -> ResolvedMode, materialized ModePlan + content-hash signature

## Brief

This feature delivers `src/resolver.ts`: it turns a mode specifier (a preset name
or an explicit component set) into a `ResolvedMode`, then **materializes it into a
ModePlan** — an ordered list of fragment references with their loaded content,
plus the `mode.signature` that enters the cache key. The ModePlan is the seam the
codex advisory identified as load-bearing: the handler must obtain the signature
**before** `getCachedResult()` to decide hit vs miss, and `deterministic-splice`
must assemble from the **same** ordered, already-loaded plan so signature and
splice can never drift in order or content.

`mode.signature` is a **content hash** (the epic's locked decision): it hashes the
ordered contents of the selected fragments (so editing a fragment changes the
signature → forces a re-assemble next turn), composed with the model + base key
parts upstream in the handler. Modifier ordering is **preset-declared order**;
duplicate modifiers are de-duplicated first-occurrence-wins so the order is
deterministic. `base: "pi"` contributes no overlay but is still part of the
signature (distinguishing a real mode from no-mode).

This feature also owns the **minimal non-user-facing active-mode seam**: a
module-scope override holder (`setActiveMode`/`getActiveMode` or equivalent,
internal/test-facing) so the handler and tests can set an active mode WITHOUT the
user-facing `/mode` command, config default, or keybinding — those belong to
`epic-switching-paths`, which later drives this same seam. Resolution precedence
for THIS epic is just `internal override > unset`; switching-paths extends it to
`session override > config default > unset`.

This feature does NOT splice (that is `deterministic-splice`), does NOT wire the
handler (that is `handler-wiring`), and does NOT expose user selection (that is
`epic-switching-paths`).

## Epic context

- Parent epic: `epic-mode-composition`
- Position in epic: **the resolution + materialization core; depends on both
  foundations.** Produces the `ModePlan` (ordered fragments + signature) that the
  splice consumes and the handler keys on.

## Foundation references

- `docs/SPEC.md` — "Mode composition" (component set + fixed order), "Cache key
  and the change signal" (`mode.signature` in the key), "Switching paths"
  (resolution precedence — only the override tier is in scope here).
- `docs/ARCHITECTURE.md` — "Per-turn data flow" (steps 1-2, 4-6: resolve mode,
  compute key, materialize), "Components" (`src/resolver.ts`).

## Inherited / epic design decisions (do not re-litigate)

- **Content-hash `mode.signature`** over the ordered selected-fragment contents.
- **ModePlan materialization seam** (resolved in the epic's codex advisory):
  resolver loads the selected fragments (via `fragment-loader`), preserves ordered
  refs, and computes the signature; `assemble.ts` consumes that plan rather than
  re-loading — preventing hash/order drift, and giving the handler the signature
  pre-cache-check.
- **Modifier ordering** = preset-declared order; duplicates de-duped first-wins.
- **Non-user-facing active-mode seam** (resolved in the epic's codex advisory):
  internal/test override holder; `epic-switching-paths` drives it later.
- **Validation fail-fast**: a resolved selection missing a required axis fragment
  file (no `agency`/`quality`/`scope` match) fails fast.
