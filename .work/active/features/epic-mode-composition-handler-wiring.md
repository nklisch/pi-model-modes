---
id: epic-mode-composition-handler-wiring
kind: feature
stage: implementing
tags: [tests]
parent: epic-mode-composition
depends_on: [epic-mode-composition-mode-resolver, epic-mode-composition-deterministic-splice]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Handler Wiring — engine into the per-turn handler + inspect Mode line

## Brief

This feature wires the composition engine into the live per-turn path. `src/handler.ts`
currently passes `NO_MODE_SIGNATURE` as the `modeSignature` and injects identity only;
this feature makes it resolve the active mode each turn, materialize the ModePlan (via
`mode-resolver`), use `plan.signature` (instead of `NO_MODE_SIGNATURE`) as the
`modeSignature` component of the cache key, and on a MISS call `assemble.ts` with the
identity + plan + `e.systemPrompt`. When no mode is active, the handler preserves the
existing behavior exactly — `NO_MODE_SIGNATURE` + identity-only — so Invariant 3
(no-op when unset) is unbroken.

It also populates the `/mode:inspect` `Mode:` line: `src/commands.ts` already exposes
the `formatModeSummary()` seam returning `"unset"`; this feature feeds it the active
ModePlan so it renders the composed summary (base / axes / +modifiers) when a mode is
set, `unset` otherwise. Per the codex advisory, this feature carries **smoke coverage
only** (a mode set changes the cache key and the inspect Mode line); the full N-turn
Invariant-1/2 acceptance tests are owned by `engine-invariant-tests`.

This feature does NOT author the resolution/materialization or splice logic (it
consumes `mode-resolver` + `deterministic-splice`), and does NOT add user-facing mode
selection (`epic-switching-paths`) — it drives the engine through the internal
active-mode seam the resolver provides.

## Epic context

- Parent epic: `epic-mode-composition`
- Position in epic: **integration — consumes resolver + splice; the engine's first
  contact with the live handler.** Unblocks `engine-invariant-tests`.

## Foundation references

- `docs/SPEC.md` — "Integration point: before_agent_start", "Cache key and the change
  signal" (mode switch is the second thing that forces a re-assemble), "The three
  invariants" (3: no-op when unset survives).
- `docs/ARCHITECTURE.md` — "Per-turn data flow" (steps 2-8 now fully populated),
  "Cache and change signal" (the `/mode:inspect` Mode line).
- `src/handler.ts`, `src/commands.ts` (current) — the files this feature edits.

## Inherited / epic design decisions (do not re-litigate)

- **Replace `NO_MODE_SIGNATURE` with `plan.signature` only when a mode is active**;
  unset still uses `NO_MODE_SIGNATURE` + identity-only (Invariant 3 preserved).
- **Signature computed before the cache check** (the ModePlan seam); assemble runs
  on MISS only.
- **`formatModeSummary()` fed the active plan**; renders composed summary or `unset`.
- **Smoke coverage here; full invariant tests in `engine-invariant-tests`** (from the
  epic's codex advisory).

## Design decisions (resolved during feature-design)

Resolved under autopilot (scope `--all`), informed by a codex integration advisory
(folded in below). Implementation tier: OPUS.

- **Two-path MISS, unset byte-identical.** The handler resolves the active
  `ModePlan` each turn and uses `plan.signature` as the cache key's
  `modeSignature` (`=== NO_MODE_SIGNATURE` when unset, so the unset key is
  unchanged). On MISS: when `plan.mode === undefined` (unset) keep the EXISTING
  identity-only form `identity ? \`${identity}\n${e.systemPrompt}\` : e.systemPrompt`
  (single `\n` — preserves Invariant 3 and the landed `noop`/`clean-base` byte
  assertions, which are in separate, isolated test files); when a mode is active
  route through `assembleSystemPrompt(identity, plan, e.systemPrompt)` (blank-line
  join). Routing unset through `assemble` would change its bytes (blank-line join,
  empty-base drop) and break Invariant 3 — so the two-path split is deliberate.
- **Active-mode test = `plan.mode === undefined`**, NOT `fragments.length`. The
  resolver makes unset the only `{mode:undefined, signature:NO_MODE_SIGNATURE,
  fragments:[]}` case; a real `base:"pi"` mode has a non-empty signature and axis
  fragments. (codex point 2.)
- **Resolve before the cache check.** `resolveActiveModePlan()` runs every turn
  (even before a HIT) because the signature is part of the key. Acceptable —
  fragment loads are mtime-cached (active mode also does discovery/manifest reads,
  but at ≤~15 files this is cheap). `getCachedResult()` stays exactly once per
  turn; if resolution throws, the turn counter does not advance (fail-fast, fine).
- **`/mode:inspect` Mode line uses `resolveActiveModePlan().mode`** (the resolved
  axes), NOT `getActiveMode()` (which may be a raw preset string). The inspect
  handler wraps the resolve in **try/catch**: a fragment that vanished after
  `setActiveMode` would otherwise crash the diagnostic command. On failure it
  renders a graceful `Mode: (unresolvable — <message>)` line instead of throwing.
  (Inspect mixes the live mode with the last-handled-turn cache snapshot — inherent
  to a snapshot command; the change-signal reason explains the last change.)
- **Shorten the mode signature in `formatChangeDetail`.** Now that real 64-char
  signatures land, the `mode-switched` detail (`<from> → <to>` over modeSignature)
  would be noisy. Render the signatures shortened (first4…last4, reuse the inspect
  `shortHex`) for the `mode-switched` reason.
- **Smoke coverage here; full N-turn invariants in `engine-invariant-tests`.** A
  new `tests/handler-mode.test.ts` (resolver+cache+fragment reset in `beforeEach`):
  active-mode MISS byte shape (identity + ordered fragments + base, blank-line
  joined); the active-mode key differs from the unset key; switching mode → MISS →
  different bytes/key; `clearActiveMode()` → back to identity-only single-`\n`; an
  inspect Mode-line test (renders the composed summary; and the invalid-mode path).
- **Docs roll-forward lands here** (deferred from `deterministic-splice`): the
  ARCHITECTURE enforcement-table clean-base + cache-stability rows now credit
  `assemble.ts` (+`cache.ts`) because the handler routes the MISS through it; the
  "no `assemble.ts` yet" parenthetical is removed. ALSO fix the stale fragment-cache
  line (`process restart (or /reload)`) → stat/mtime-invalidated (edits apply next
  turn) — the loader landed that way.
- **No child stories** — one integration stride (handler edit + commands evolution +
  smoke test + docs).

## Other agent review

A codex integration advisory (peeragent, `--effort high`) ran on the wiring.
Accepted and folded in: preserve the unset single-`\n` path (two-path split);
`plan.mode===undefined` as the active-mode test; resolve-before-cache is necessary
+ acceptable; inspect uses `resolveActiveModePlan().mode` with try/catch for a
graceful invalid-mode line; shorten mode signatures in `formatChangeDetail`; reset
resolver/cache around active-mode tests; roll the ARCHITECTURE enforcement table
forward AND fix the stale fragment-cache description. No points rejected. Overall
codex take: "the wiring plan is sound; preserve the unset byte path, resolve before
cache, and tighten inspect/docs around real signatures and resolve-time failures."

## Implementation Units

### Unit 1: `src/handler.ts` — resolve + two-path MISS

Add imports: `resolveActiveModePlan` from `./resolver.js`, `assembleSystemPrompt`
from `./assemble.js`. In `handleBeforeAgentStart`:
```ts
const model = ctx.model;
const plan = resolveActiveModePlan();              // BEFORE the cache check
const inputs: CacheKeyInputs = {
  modelId: model?.id ?? "",
  modelProvider: model?.provider ?? "",
  modeSignature: plan.signature,                   // NO_MODE_SIGNATURE when unset
  baseSystemPrompt: e.systemPrompt,
};
const key = computeCacheKey(inputs);
const cached = getCachedResult(key);
if (cached !== undefined) return { systemPrompt: cached };  // HIT unchanged

const identity = model ? deriveIdentityLine(model) : "";
const result =
  plan.mode === undefined
    ? identity ? `${identity}\n${e.systemPrompt}` : e.systemPrompt  // unset: Invariant 3
    : assembleSystemPrompt(identity, plan, e.systemPrompt);          // mode active
setCachedResult(key, result, inputs);
return { systemPrompt: result };
```
Update the JSDoc to describe the two-path MISS + mode signature.

### Unit 2: `src/commands.ts` — populate the Mode line + shorten mode sig

- `formatModeSummary(mode: ResolvedMode | undefined): string` — `undefined →
  "unset"`; else `base:${mode.base} • agency:${mode.agency} • quality:${mode.quality}
  • scope:${mode.scope}` + `${mode.modifiers.map(m => ` • +${m}`).join("")}`.
  (Preset-name prefix deferred to switching-paths.)
- `renderModeInspect(snapshot, model, mode: ResolvedMode | undefined, modeError?: string)`
  — the Mode line is `Mode: ${modeError ? `(unresolvable — ${modeError})` :
  formatModeSummary(mode)}`. Other lines unchanged.
- `formatChangeDetail` `mode-switched` case: render `(${shortHex(from||"unset")} →
  ${shortHex(to)})` so 64-char signatures don't dominate. (`shortHex` already
  exists for the cache key; apply it to mode-sig from/to. Empty "" → render
  "unset".)
- `registerModeInspectCommand` handler: resolve the active mode + render:
  ```ts
  let mode: ResolvedMode | undefined;
  let modeError: string | undefined;
  try { mode = resolveActiveModePlan().mode; }
  catch (err) { modeError = (err as Error).message; }
  const content = renderModeInspect(getChangeSignal(), ctx.model, mode, modeError);
  ```
  Import `resolveActiveModePlan` + `type ResolvedMode`.

### Unit 3: `tests/commands.test.ts` — evolve for the mode param

Update `renderModeInspect` call sites to pass a `mode` (start with `undefined` →
still `Mode: unset`). Add: a composed-mode summary render test; an invalid-mode
(`modeError`) render test; a `formatChangeDetail` shortened-mode-signature test
(feed a `mode-switched` ring entry with 64-char sigs, assert the rendered detail
is shortened, not the full hash).

### Unit 4: `tests/handler-mode.test.ts` (new) — smoke coverage

`beforeEach`: `resetCacheForTesting()`, `resetResolverForTesting()`,
`resetFragmentCacheForTesting()`, `resetPresetsForTesting()`;
`setFragmentRootForTesting(<fixture or real root>)`. Cover: active-mode MISS byte
shape (identity + ordered fragments + base via `assembleSystemPrompt`); active-mode
key ≠ unset key; switching mode → MISS → different bytes; `clearActiveMode()` → back
to identity-only single-`\n`; identity="" + mode active → fragments + base (no
identity). Build a fixture prompts tree + an explicit `ResolvedMode` via
`setActiveMode`.

### Unit 5: `docs/ARCHITECTURE.md` — enforcement table + fragment-cache line

- Enforcement table: Clean-base → `assemble.ts`; Cache stability → `assemble.ts` +
  `cache.ts`; drop the "no assemble.ts yet" parenthetical.
- Fix the per-turn-cache table / fragment-cache prose: the fragment file cache
  invalidation is **stat/mtime (edits apply next turn)**, not "process restart (or
  /reload)".

## Acceptance criteria
- [ ] Unset turns are byte-identical to the pre-wiring handler (noop/clean-base/
  handler tests pass UNCHANGED); unset key uses NO_MODE_SIGNATURE.
- [ ] A set mode → MISS assembles identity + ordered fragments + base (blank-line
  join via `assemble`); the key differs from the unset key.
- [ ] Switching the active mode → MISS → different bytes + key; clearing → back to
  identity-only single-`\n`.
- [ ] `/mode:inspect` Mode line renders the composed summary for a set mode,
  `unset` when none, and `(unresolvable — …)` if resolution throws.
- [ ] `formatChangeDetail` shortens mode signatures for `mode-switched`.
- [ ] `resolveActiveModePlan()` called once per turn before the cache check;
  `getCachedResult` still once per turn.
- [ ] `docs/ARCHITECTURE.md` enforcement table + fragment-cache line rolled forward.
- [ ] `npm run typecheck` clean; full suite green.

## Risks
- **Module-state leak across active-mode tests** (mitigated): `handler-mode.test.ts`
  resets resolver+cache+fragment+presets in `beforeEach`; the existing
  noop/clean-base/handler tests are isolated files that never set an active mode, so
  they keep passing unchanged.
- **Inspect throwing on a vanished fragment** (mitigated): try/catch → graceful
  invalid-mode line.
