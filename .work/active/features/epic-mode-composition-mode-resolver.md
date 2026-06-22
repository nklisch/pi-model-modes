---
id: epic-mode-composition-mode-resolver
kind: feature
stage: done
tags: [tests]
parent: epic-mode-composition
depends_on: [epic-mode-composition-fragment-loader, epic-mode-composition-preset-table]
release_binding: v0.2.0
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

## Design decisions (resolved during feature-design)

Resolved under autopilot (scope `--all`), informed by a codex design advisory on
the ModePlan contract (folded in below). Implementation tier: OPUS.

- **ModePlan shape** (the contract 3 features consume): `{ mode, signature,
  fragments }`. `fragments` is the ordered, identity-independent, already-loaded
  content list the splice concatenates; `signature` is what the handler feeds
  `computeCacheKey` BEFORE the hit/miss check; `mode` (the `ResolvedMode` or
  `undefined`) is for `/mode:inspect` + switching summaries. **Identity is NOT in
  the plan** — the splice prepends it separately.
- **Signature includes a virtual `base:pi` entry.** `base === PI_BASE` contributes
  no overlay fragment but MUST still participate in the signature (epic decision:
  base:pi is a real mode). So the canonical signature input always carries a base
  entry — the real overlay's `[base, value, sha256(content)]` OR a virtual
  `[base, "pi", ""]` when PI_BASE — followed by agency/quality/scope/modifier
  entries. Encoding is length-delimited (mirrors `cache.ts`'s `encodeComponents`)
  then sha256. Model id/provider and `e.systemPrompt` are EXCLUDED (the handler
  composes those in `computeCacheKey`).
- **Active-mode seam**: `ModeSpec = string | ResolvedMode`. `undefined` = unset.
  Explicit `ResolvedMode` specs are **cloned on set** (so callers can't mutate
  active state) and **runtime-validated** (later config/commands feed this seam
  from untyped input). `switching-paths` layers precedence (override > config >
  unset) on top of this same seam.
- **Set-time validation + resolve-time integrity.** `setActiveMode(spec)` fully
  materializes the plan once and throws on any failure (unknown preset, missing
  fragment, bad axis value) so a known-bad mode never becomes active. The per-turn
  `resolveActiveModePlan()` re-materializes and re-throws — files can change after
  selection, so resolve-time is the integrity gate.
- **Re-materialize every turn (no plan memo) for v1.** The handler calls
  `resolveActiveModePlan()` per turn to get the signature; re-materializing relies
  on `fragment-loader`'s mtime cache for cheap loads and honors live fragment
  edits. **Fast-path no-mode**: when unset, return the no-mode plan with ZERO
  discovery/load work. A memo keyed on spec+mtimes is deferred (a bad key could
  silently break the content-hash promise) until measured.
- **`discoverModifiers()` only when modifiers are non-empty** (fast-path; a mode
  with no modifiers does no modifier discovery). Empty modifiers is valid.
- **Ambiguous matches fail fast.** If a value name matches more than one
  discovered fragment (possible for base overlays drawn from a multi-dir manifest),
  throw rather than first-match-win. Axis dirs can't hold two same-basename files,
  but the check is uniform across slots.
- **Modifier de-dup**: preset-declared order, first-occurrence-wins.
- **No child stories** — one cohesive module (resolver + ModePlan + signature +
  seam) + its test. The feature IS the unit.

## Other agent review

A codex design advisory (peeragent, `--effort high`) ran on the ModePlan contract.
Accepted and folded in: the virtual `base:pi` signature entry; clone + runtime-
validate explicit `ResolvedMode` specs; set-time validation in addition to resolve-
time; fast-path no-mode; fail on duplicate/ambiguous basename matches; only call
`discoverModifiers()` when modifiers are non-empty; keep identity out of the plan;
exclude model/base-prompt from the mode signature. Overall codex take: "the contract
is viable, but make base:\"pi\" signature participation and runtime normalization/
validation explicit before implementation" — both now explicit.

## Architectural choice

A single pure module `src/resolver.ts` owning: the `ModePlan`/`PlannedFragment`
types, the internal active-mode state + seam, preset/explicit resolution,
fragment materialization (via `fragment-loader`), and content-hash signature
computation. It depends DOWN on `presets.ts` (`getPreset`/`loadPresets`/`PI_BASE`/
`ResolvedMode`) and `fragments.ts` (`discoverAxis`/`discoverModifiers`/
`discoverBaseOverlays`/`loadFragment`); `assemble.ts` and the handler depend UP on
it. No pi-runtime coupling — fully unit-testable with the fragment/preset test
overrides.

## Implementation Units

### Unit 1: `src/resolver.ts`

```ts
import { createHash } from "node:crypto";
import { basename } from "node:path";
import {
  PI_BASE,
  getPreset,
  loadPresets,
  type ResolvedMode,
} from "./presets.js";
import {
  AXES,
  discoverAxis,
  discoverModifiers,
  discoverBaseOverlays,
  loadFragment,
  type Axis,
} from "./fragments.js";
import { NO_MODE_SIGNATURE } from "./cache.js";

export type FragmentSlot = "base" | Axis | "modifier";

/** One materialized fragment in splice order. */
export interface PlannedFragment {
  slot: FragmentSlot;
  value: string;   // basename without ".md", e.g. "autonomous"
  path: string;    // absolute
  content: string; // loaded + trimmed
}

/** The materialized plan: signature for the cache key + ordered content for the
 *  splice + the resolved selection for inspect/summary. Identity is NOT here. */
export interface ModePlan {
  mode: ResolvedMode | undefined;          // undefined ⇔ no active mode
  signature: string;                       // NO_MODE_SIGNATURE when no mode
  fragments: readonly PlannedFragment[];   // [] when no mode
}

/** What can be set active: a preset name or an explicit selection. */
export type ModeSpec = string | ResolvedMode;

// --- internal active-mode state (switching-paths drives this seam later) -----
let activeSpec: ModeSpec | undefined;

/** Set the active mode. Validates by fully materializing once (throws on unknown
 *  preset / missing fragment / bad axis value) so a known-bad mode never becomes
 *  active. Explicit ResolvedMode specs are cloned so later caller mutation can't
 *  affect active state. */
export function setActiveMode(spec: ModeSpec | undefined): void;
export function getActiveMode(): ModeSpec | undefined;
export function clearActiveMode(): void; // setActiveMode(undefined)

/** Materialize the active mode into a ModePlan. Fast-paths no-mode (no discovery).
 *  Re-materializes + re-hashes each call (honors live fragment edits via the
 *  loader's mtime cache). THROWS on missing/ambiguous fragments (integrity). */
export function resolveActiveModePlan(): ModePlan;

/** TEST-ONLY: clear active-mode state. */
export function resetResolverForTesting(): void;
```

**Implementation notes**:
- **Resolution**: `string` spec → `getPreset(spec, loadPresets())` → a `Preset`
  (same shape as `ResolvedMode`). `ResolvedMode` spec → use directly. Normalize:
  copy fields, de-dup `modifiers` first-wins (`[...new Set(modifiers)]` preserves
  first-occurrence order).
- **Materialize** `materializePlan(mode: ResolvedMode): ModePlan`:
  - `fragments: PlannedFragment[] = []`; `sigEntries: {slot,value,hash}[] = []`.
  - **base**: if `mode.base === PI_BASE` → push sig entry `{base,"pi",""}` only
    (no fragment). Else `matchOne(discoverBaseOverlays(), mode.base, "base")` →
    load → push fragment + sig `{base, value, sha256(content)}`.
  - **axes** (`for axis of AXES`): `matchOne(discoverAxis(axis), mode[axis], axis)`
    → load → push fragment + sig entry.
  - **modifiers**: if `mode.modifiers.length`: `const mods = discoverModifiers()`;
    for each (deduped) modifier name → `matchOne(mods, name, "modifier")` → load →
    push fragment + sig entry.
  - `signature = sha256(encode(sigEntries))`.
- **`matchOne(paths, value, slot)`**: `const hits = paths.filter(p =>
  basename(p, ".md") === value)`. `hits.length === 0` → throw
  `mode <slot> "<value>" has no fragment file`. `hits.length > 1` → throw
  `ambiguous <slot> "<value>" matches N fragments`. Return `hits[0]`.
- **`encode(entries)`**: length-delimited canonical string — for each entry,
  `${byteLen(slot)}:${slot}|${byteLen(value)}:${value}|${byteLen(hash)}:${hash}`
  joined by `\n` (mirrors `cache.ts`'s `encodeComponents` discipline so field
  boundaries can't collide). `sha256(s)` = `createHash("sha256").update(s,"utf8")
  .digest("hex")`.
- **`resolveActiveModePlan()`**: if `activeSpec === undefined` → return
  `{ mode: undefined, signature: NO_MODE_SIGNATURE, fragments: [] }` (no discovery).
  Else `materializePlan(normalize(activeSpec))`.
- **`setActiveMode(spec)`**: if `undefined` → `activeSpec = undefined`. Else
  `const normalized = normalize(spec)` (clones); `materializePlan(normalized)`
  (validate — throws on failure, leaving `activeSpec` unchanged); then
  `activeSpec = spec` is a string OR the cloned normalized ResolvedMode (never the
  caller's object). Validation runs BEFORE assignment so a throw leaves prior
  state intact.
- All errors `throw new Error(...)` naming slot+value — Fail Fast.

**Acceptance criteria**:
- [ ] No active mode → `resolveActiveModePlan()` returns
      `{mode:undefined, signature:NO_MODE_SIGNATURE, fragments:[]}` and does NO
      fragment discovery/load.
- [ ] A preset spec resolves: `fragments` ordered base?→agency→quality→scope→
      modifiers, each with loaded trimmed content; `signature` non-empty.
- [ ] `base===PI_BASE` → no base fragment in `fragments`, but the signature
      DIFFERS from an otherwise-identical mode with a real base (virtual entry).
- [ ] Editing a selected fragment's file (mtime bump) changes the signature on the
      next `resolveActiveModePlan()`; no edit → identical signature (stable).
- [ ] Modifier order = preset order; duplicate modifiers de-duped first-wins.
- [ ] Missing axis/base/modifier fragment → throws (set-time AND resolve-time);
      ambiguous (>1 basename match) → throws.
- [ ] `setActiveMode` validates (a bad spec throws and does NOT become active);
      explicit `ResolvedMode` specs are cloned (post-set caller mutation is inert).
- [ ] `resetResolverForTesting()` clears active state.

## Implementation Order
1. `src/resolver.ts` (Unit 1).
2. `tests/resolver.test.ts` — fixtures via `setFragmentRootForTesting` (a fixture
   prompts tree) + `loadPresets({json})` for preset specs; cover every acceptance
   criterion incl. signature stability/edit-sensitivity, base:pi signature
   participation, dedup, fail-fast, clone-on-set, fast-path no-mode (assert no
   throw + empty plan even with NO fragment root configured).

## Testing
- **Signature edit-sensitivity**: materialize a mode, capture signature; bump a
  selected fragment's mtime+content; re-resolve; assert signature changed. No
  change → identical signature across N calls (Invariant-2 seed at the resolver
  level).
- **base:pi participation**: two modes identical except base (pi vs a real
  overlay) → different signatures.
- **Fail-fast**: preset/explicit mode referencing a non-existent axis value →
  throws at set AND resolve; ambiguous base match → throws.
- **Fast-path no-mode**: with NO `setFragmentRootForTesting` configured at all,
  `resolveActiveModePlan()` (unset) must NOT throw and must return the empty plan
  (proves zero discovery on the no-mode path).
- **Clone-on-set**: set an explicit `ResolvedMode`, mutate the caller's object +
  its `modifiers` array afterward, resolve → plan reflects the value AT SET TIME.
- Module-state isolation: `beforeEach` resets resolver + fragment + preset caches.

## Risks
- **Per-turn re-hash cost** (LOW): ≤ ~15 small fragments hashed per turn; the
  handler's result cache short-circuits the expensive splice on a hit. Memo
  deferred until measured (a bad memo key would break the content-hash promise).
- **Signature ≠ cache.ts's internal hash** (BY DESIGN): the mode signature is an
  opaque deterministic string fed to `computeCacheKey`; it need not match the
  cache's own encoding, only be stable + collision-resistant across selections.
- **Set-time validation does I/O** (ACCEPTED): `setActiveMode` materializes once
  to reject bad modes early; it's a user-action-frequency call, not per-turn.

## Implementation notes

Landed exactly per Unit 1, no contract deviations.

**`src/resolver.ts`** — the pure resolution + materialization core:
- Types `FragmentSlot`, `PlannedFragment`, `ModePlan`, `ModeSpec` per the spec;
  internal `SigEntry` for signature building; module-scope `activeSpec` state.
- `setActiveMode`/`getActiveMode`/`clearActiveMode`/`resolveActiveModePlan`/
  `resetResolverForTesting` per the exact signatures.
- `normalize(spec)`: string → `getPreset(spec, loadPresets())`; `ResolvedMode`
  → field clone; `modifiers` de-duped first-wins via `[...new Set(...)]`. Always
  returns a fresh resolver-owned object.
- `materializePlan(mode)`: base (PI_BASE → virtual sig entry `{base,"pi",""}` and
  NO fragment; else `matchOne(discoverBaseOverlays(),...)` → load → fragment +
  sig); axes via `matchOne(discoverAxis(axis),...)`; modifiers discovered/loaded
  ONLY when non-empty. Builds the ordered `fragments[]` AND the `sigEntries[]`.
- `matchOne(paths,value,slot)`: basename filter; 0 → "has no fragment file"; >1 →
  "ambiguous … matches N fragments"; else the single hit.
- `encode(sigEntries)`: length-delimited `<byteLen>:<field>` per slot/value/hash
  joined by `|`, entries by `\n` (mirrors `cache.ts`'s `encodeComponents`);
  `sha256` via `createHash("sha256")`.
- Fast-path no-mode (`activeSpec === undefined` → `{undefined, NO_MODE_SIGNATURE,
  []}` with ZERO discovery). `setActiveMode` validates by materializing the
  normalized clone BEFORE assignment (throw leaves prior state intact) and stores
  the string OR the cloned normalized `ResolvedMode` — never the caller's object.
  `.js` ESM imports; `node:crypto`/`node:path` for builtins.

**`tests/resolver.test.ts`** — 15 tests covering every acceptance criterion:
no-mode fast-path (incl. NO fragment root configured), preset/explicit resolution
+ ordered fragments + trimmed content, base:pi signature participation (pi vs real
overlay → different signatures), signature edit-sensitivity (mtime bump → changed;
no edit → stable across N calls), modifier dedup + order, fail-fast (missing
axis/base/modifier at set AND resolve-time integrity; ambiguous base match),
set-time validation (bad spec throws + does NOT become active; prior mode survives
a failed set), clone-on-set (post-set caller mutation inert), seam basics.
`beforeEach` resets resolver + fragment + preset caches.

**Verification**: `npm run typecheck` clean; `npm test` green — 154 tests (139
prior + 15 new resolver tests), 11 files. No deviations from the contract; no
dependency-export mismatches surfaced.

## Review record

**Verdict: Approve** — deep lane (feature), cross-model review via codex
(peeragent, --effort high).

Codex confirmed the signature materialization is correct: content edits (mtime
bump) move the signature, base:pi participates via the virtual entry, model/base-
prompt/identity are excluded, encoding is length-delimited, ordering is
base→agency→quality→scope→modifiers, modifier dedup is first-wins, the no-mode
fast path avoids discovery, and setActiveMode validates before assignment. One
should-fix fixed: getActiveMode() returned activeSpec by reference (mutable-state
leak) — now clones object specs (clone-on-read test added). Two test nits fixed
(mislabeled explicit-spec test; base:pi test strengthened to distinguish from
NO_MODE_SIGNATURE). 155 tests green, typecheck clean. Advanced review → done.
