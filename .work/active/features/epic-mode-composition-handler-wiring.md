---
id: epic-mode-composition-handler-wiring
kind: feature
stage: drafting
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
