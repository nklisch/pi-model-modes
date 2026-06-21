---
id: epic-mode-composition
kind: epic
stage: implementing
tags: [tests]
parent: null
depends_on: [epic-scaffold-handler]
release_binding: null
gate_origin: null
created: 2026-06-20
updated: 2026-06-21
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

## Decomposition

Split by capability along the producer/consumer seams the SPEC and ARCHITECTURE
imply, refined by the codex design advisory (below). Two pure foundations
parallelize (`fragment-loader`, `preset-table`); a resolution+materialization
core sits on both and produces the **ModePlan** (the ordered, content-loaded,
content-hash-signed plan); the splice consumes that one plan (no re-load → no
hash/order drift); the handler-wiring integrates the engine into the live
per-turn path; and the engine-invariant-tests discharge the inherited
`clean-base.test.ts` upgrade plus mode-set stability/ordering. Critical path:
foundations → resolver → splice → handler-wiring → tests.

The decisive refinement over the provisional sketch (from the codex advisory):
the `mode.signature` is **materialized in the resolver, not deferred to
assemble** — because the handler needs the signature *before* the cache hit/miss
check, and assembly runs MISS-only. The resolver emits a single ordered ModePlan
(refs + loaded content + signature) that both the cache key and the splice are
derived from.

### Child features

- `epic-mode-composition-fragment-loader` — `src/fragments.ts`: convention-dir
  discovery (filename-sorted) + stat/mtime-invalidated module-scope content
  cache; package-relative root w/ test override; ships the minimal starter
  fragment set — depends on: `[]`
- `epic-mode-composition-preset-table` — `src/presets.ts` + `presets.json`: the
  `ResolvedMode` selection type (with the `base:"pi"` default sentinel) + preset
  schema/loader/validation — depends on: `[]`
- `epic-mode-composition-mode-resolver` — `src/resolver.ts`: specifier/preset →
  `ResolvedMode`, materialize the ordered ModePlan + content-hash `mode.signature`;
  internal non-user-facing active-mode seam; modifier ordering rules — depends on:
  `[epic-mode-composition-fragment-loader, epic-mode-composition-preset-table]`
- `epic-mode-composition-deterministic-splice` — `src/assemble.ts`: assemble
  identity + plan + `e.systemPrompt` in the SPEC's fixed order, ordered-array
  only, consuming the plan (no re-load) — depends on:
  `[epic-mode-composition-mode-resolver]`
- `epic-mode-composition-handler-wiring` — `src/handler.ts` + `commands.ts`
  `formatModeSummary`: real signature on the cache key, assemble on MISS, inspect
  Mode line, Invariant-3 preserved when unset; smoke coverage only — depends on:
  `[epic-mode-composition-mode-resolver, epic-mode-composition-deterministic-splice]`
- `epic-mode-composition-engine-invariant-tests` — upgrade
  `tests/clean-base.test.ts` to full Invariant 1 + mode cache-stability +
  deterministic ordering — depends on:
  `[epic-mode-composition-handler-wiring]`

### Decomposition risks

- **Fragment-cache invalidation vs the live-edit promise.** A read-once
  `Map<path,string>` cannot observe edits, but the locked decision wants edited
  fragments to apply next turn. Resolved: stat/mtime-based invalidation in
  `fragment-loader` (cheap stat per access; full re-read only on mtime change).
- **Signature/splice drift.** If `assemble.ts` independently re-loaded fragments,
  its bytes could diverge from what the signature hashed. Resolved: the resolver
  emits one ordered ModePlan; the splice consumes it (never re-loads/re-orders).
- **No user-facing mode source yet (switching-paths is a later epic), but the
  handler + tests must set an active mode.** Resolved: a minimal internal
  active-mode seam in `mode-resolver`; switching-paths drives it later.
- **`base:"pi"` vs `NO_MODE_SIGNATURE`.** A mode with the default base is still a
  real (non-empty-signature) mode; no-mode is `""`. Conflating them would break
  Invariant 3. Resolved: explicit `base:"pi"` sentinel in `preset-table`'s type.

## Design decisions

- **mode.signature composition**: Content-hash, not name-only. The cache key
  hashes the CONTENT of the selected fragments (plus `model.id`,
  `model.provider`, and `hash(e.systemPrompt)`). Editing a fragment `.md`
  takes effect on the next turn within the same session — no `/reload` or
  restart needed. Still deterministic and cache-stable: fragment contents do
  not change between turns unless edited, so Invariant 2 (byte-identical
  across no-change turns) holds.
- **Fragment layout and discovery**: Hybrid. Axes (`agency`/`quality`/`scope`)
  and `modifiers/` are discovered by directory convention — drop a `.md` in
  `axis/agency/` and it is a new selectable value, no code change. `base/`
  keeps an ordered manifest (`base.json`) because slot order is load-bearing
  for deterministic splicing. Matches pi's convention-directory philosophy
  (packages.md) and the reference plugin's approach.
- **Discovery invalidation**: Because the cache key hashes fragment CONTENT,
  newly-added or edited fragment files are picked up automatically when their
  hash changes — the module-scope fragment-file cache and the per-turn result
  cache stay consistent without explicit registration.
- **Cache stability preserved**: Ordered-array assembly only (no `Set`
  iteration, no unordered object keys). Convention discovery yields
  deterministic file orderings (sorted by filename) so the splice is
  reproducible across turns; the base manifest pins base ordering explicitly.

## Handoff obligations inherited

- **Upgrade `clean-base.test.ts` to the full SPEC Invariant 1.** The test
  scaffolded under `epic-scaffold-handler-noop-handler` is the *scaffolding
  form* (no mutation, no cached previous output) — it cannot test "across N
  turns with a mode set" until modes exist. When this epic lands the splice,
  upgrade that test to the real form. (From codex design review of
  epic-scaffold-handler's decomposition.)

## Design decisions (resolved during decomposition)

Resolved under autopilot delegation (scope `--all`), informed by the codex
design advisory. These EXTEND the locked decisions above; they do not override
them. Implementation tier for the implement passes: OPUS.

- **`mode.signature` is materialized in the resolver (the ModePlan seam), not in
  `assemble.ts`.** The handler needs the signature before `getCachedResult()` to
  decide hit/miss; assembly is MISS-only. The resolver emits one ordered ModePlan
  (refs + loaded content + signature); both the cache key and the splice derive
  from it. Prevents hash/order drift.
- **Fragment-cache invalidation = stat/mtime-based** (not read-once). Honors the
  locked live-edit-next-turn promise without `/reload`; I/O is a stat per access,
  full re-read only on mtime change. Owned by `fragment-loader`.
- **Non-user-facing active-mode seam** lives in `mode-resolver` (internal/test
  override holder). `epic-switching-paths` later drives it with `/mode` + config
  default + keybinding. Resolution precedence for THIS epic: `override > unset`.
- **`base:"pi"` default sentinel** (distinct from `NO_MODE_SIGNATURE=""`) in
  `preset-table`'s `ResolvedMode` type: a real mode that contributes no base
  overlay but a non-empty signature.
- **Modifier ordering = preset-declared order; duplicate modifiers de-duped
  first-occurrence-wins** (deterministic). CLI-order override is a later
  switching-paths concern.
- **Validation fail-fast across the engine**: unknown preset / duplicate ids
  (`preset-table`), missing manifest-referenced file / unreadable dir
  (`fragment-loader`), resolved selection missing a required axis fragment
  (`mode-resolver`). Fail Fast at boundaries per the principles.
- **clean-base.test.ts upgrade lives in `engine-invariant-tests`**, not
  `handler-wiring`. Handler-wiring gets smoke coverage (mode changes key + inspect
  line); the full N-turn Invariant-1 acceptance is engine-level.
- **`[refactor]` tag removed from this epic.** The engine is NET-NEW behavior
  (modes did not exist); per the project tag-semantics rule `[refactor]` is for
  behavior-preserving structural change only. Children are untagged-greenfield
  (route to `feature-design`), carrying `[tests]` as the project convention.

## Other agent review

A codex cross-model design advisory (peeragent, `--effort high`) ran on the
decomposition. Accepted and folded in: (1) keep `handler-wiring` a separate
integration feature; (2) the ModePlan/materialization seam — compute the
signature in the resolver, not assemble, so the handler has it pre-cache-check
and the splice consumes one ordered plan (no drift); (3) the `clean-base.test.ts`
upgrade belongs in `engine-invariant-tests` (handler-wiring smoke-tests only);
(4) make the fragment-cache invalidation policy explicit (stat/mtime); (5) add
the non-user-facing active-mode seam for the handler + tests; (6) represent
`base:"pi"` explicitly vs `NO_MODE_SIGNATURE`; (7) one source of truth for
modifier ordering + duplicate policy; (8) explicit validation (unknown preset,
missing axis file, orphaned/missing fragment, duplicate ids); (9) package-relative
fragment-root resolution (not cwd-relative); (10) drop the `[refactor]` tag. No
advisory points were rejected. Sizing confirmed at 6 features. Overall codex
take: "the decomposition is viable, but the signature/materialization seam and
fragment-cache invalidation policy need to be made explicit before
implementation" — both now explicit above.
