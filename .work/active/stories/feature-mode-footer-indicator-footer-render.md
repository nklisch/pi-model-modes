---
id: feature-mode-footer-indicator-footer-render
kind: story
stage: done
tags: []
parent: feature-mode-footer-indicator
depends_on: []
release_binding: v0.2.0
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Footer render core + seam (`src/footer.ts`)

## Scope

Implement **Unit 1** of `feature-mode-footer-indicator`. Create `src/footer.ts`
with the PURE render function `formatModeFooter`, the `MODE_FOOTER_KEY`
constant, the cycle-hint-enabled signal (`setCycleHintEnabled` +
`resetFooterForTesting`), and the thin pi seam `refreshModeFooter(ctx)`. Plus
`tests/footer.test.ts` covering every pure branch + the seam's `hasUI` guard
and read-only guarantees.

This is the foundation unit — Unit 2 imports `setCycleHintEnabled` from here,
and Unit 3 wires `refreshModeFooter` into the event/command/keybinding paths.

## Units

- `src/footer.ts` (new) — see the feature body "Implementation Units → Unit 1"
  for exact signatures (`MODE_FOOTER_KEY`, `ModeFooterInputs`,
  `formatModeFooter`, `setCycleHintEnabled`, `resetFooterForTesting`,
  `refreshModeFooter`).
- `tests/footer.test.ts` (new) — Unit 1 acceptance criteria below.

## Implementation notes (carry-over from the feature body)

- `formatModeFooter` precedence: `modeError` set → `mode: (unresolvable)`;
  else `mode === undefined` → `mode: unset`; else `specName` present →
  `mode: <specName>`; else compact `mode: <base>/<agency>/<quality>/<scope>`.
  Modifiers (when `mode` is defined) → ` +<n>` suffix. Cycle hint (when
  `cycleHintEnabled`) appended after the indicator in EVERY state:
  ` · <cycleForwardKey>/<cycleBackwardKey> cycle` — appears in preset / object
  / unset / unresolvable states alike.
- `source` is accepted in `ModeFooterInputs` (for symmetry with
  `formatModeListing`) but NOT rendered in v1. Keep it in the struct so adding
  it later is one line.
- The hint renders `cycleForwardKey` / `cycleBackwardKey` verbatim — the
  `CYCLE_FORWARD_KEY` / `CYCLE_BACKWARD_KEY` constants are already lowercase
  `+`-joined KeyId strings (pi's `formatKeyText` display form), so no separate
  humanizer is needed.
- `refreshModeFooter` MUST NOT import or touch the cache module, the splice,
  or any set/clear/default setter. It is read-only on resolver state.

## Acceptance criteria

- [ ] `formatModeFooter` renders:
  - `mode: <preset>` for a string preset spec (`specName` set, `mode` defined).
  - `mode: <base>/<agency>/<quality>/<scope>` for an explicit object spec
    (`specName` undefined, `mode` defined).
  - ` … +<n>` suffix when `mode.modifiers` is non-empty (preset AND object cases).
  - `mode: unset` when `mode === undefined && !modeError`.
  - `mode: (unresolvable)` when `modeError` set — wins over a defined `mode`.
- [ ] Cycle hint: when `cycleHintEnabled` is true, ` · <fwd>/<back> cycle` is
  appended in EVERY state (preset / object / unset / unresolvable); when false,
  no suffix in any state.
- [ ] Hint key tokens are the passed `cycleForwardKey` / `cycleBackwardKey`
  verbatim — proved by passing synthetic keys (e.g. `"x+y"`, `"a+b+c"`) and
  asserting they appear in the rendered output. A constant rename /
  rebind-source change propagates with zero code edits.
- [ ] `refreshModeFooter` is a no-op when `ctx.hasUI` is false (assert
  `ctx.ui.setStatus` is NOT called).
- [ ] `refreshModeFooter` calls `ctx.ui.setStatus(MODE_FOOTER_KEY, <string>)`
  exactly once when `ctx.hasUI` is true.
- [ ] `refreshModeFooter` does NOT advance the cache turn counter
  (`getChangeSignal().currentTurn` unchanged) and does NOT mutate resolver
  state (`getActiveMode()` / `getDefaultMode()` unchanged across a call).
- [ ] typecheck clean; `tests/footer.test.ts` green.

## Out of scope

- Wiring the refresh into events / commands / keybindings — Unit 3.
- The `cycleKeybinding` config flag + factory wiring — Unit 2.
- Any change to `commands.ts`, `keybinding.ts`, `resolver.ts`, `cache.ts`,
  `extensions/index.ts`, or the foundation docs.

## Implementation log

- Added `src/footer.ts` with `MODE_FOOTER_KEY`, pure `formatModeFooter`,
  the cycle-hint module signal, test reset helper, and read-only
  `refreshModeFooter(ctx)` seam.
- Added `tests/footer.test.ts` covering preset/object/unset/unresolvable
  footer rendering, `+N` modifiers, cycle hints in every state, verbatim key
  tokens, `ctx.hasUI` guard, one `setStatus` call, and cache/resolver
  read-only guarantees.
- Kept registration, command/keybinding refresh call-sites, config opt-in, and
  docs updates out of scope for the dependent Unit 2/Unit 3 stories.
