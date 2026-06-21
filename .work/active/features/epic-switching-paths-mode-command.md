---
id: epic-switching-paths-mode-command
kind: feature
stage: review
tags: []
parent: epic-switching-paths
depends_on: [epic-switching-paths-config-default]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# /mode Command Family

## Brief

This feature delivers the `/mode` command family on top of the effective-mode
state layer from `config-default`:

- `/mode` (no arg) — show the current **effective** mode and its source
  (override / default / unset) plus the available presets.
- `/mode <name|preset>` — set the session **override** (via the resolver's
  active-mode seam), validated at set-time (a bad preset/mode throws and is
  surfaced, not silently applied).
- `/mode off` — clear the override; the effective mode falls back to the config
  **default** (NOT to unset), per the precedence layer.

It registers the command in `extensions/index.ts` (edit, don't overwrite — same
co-ownership as the handler + `/mode:inspect`). It OWNS the command-output doc
semantics (how `/mode` renders). It may surface the **preset name** in
`/mode:inspect`'s Mode line (deferred to switching-paths earlier) by sharing the
effective-mode source from `config-default`.

This feature does NOT own the config read/precedence (config-default) or the
keybinding (keybinding-cycle).

## Epic context
- Parent epic: `epic-switching-paths`
- Position: **consumer of config-default; parallel to keybinding-cycle.**

## Foundation references
- `docs/SPEC.md` — "Switching paths" (`/mode` semantics).
- `docs/ARCHITECTURE.md` — "Components" (`src/commands.ts`).
- `src/commands.ts` (landed) — `/mode:inspect` + `registerModeInspectCommand`
  patterns to mirror; `src/presets.ts` (preset list); `src/resolver.ts` (seam).

## Inherited / epic design decisions (do not re-litigate)
- **`/mode off` falls back to the config default**, not unset (precedence layer).
- Set-time validation (the resolver throws on a bad mode — surface it gracefully).
- Plugin command registration is additive in `extensions/index.ts`.

## Design decisions (resolved during feature-design)

Resolved under autopilot (scope `--all`). Implementation tier: OPUS. Advisory
skipped (well-grounded by the reference `../claude-code-modes` / pi's `preset.ts`
example which shows the exact `registerCommand` + `ctx.ui.notify` patterns); codex
at the implementation review (shared with keybinding-cycle).

- **`registerModeCommand(pi)` in `src/commands.ts`** (alongside the existing
  `registerModeInspectCommand`). Registers command `"mode"`; handler
  `async (args, ctx) => {}`:
  - **empty arg** → emit a panel (`pi.sendMessage({ customType:"mode", content,
    display:true })`, no triggerTurn) showing the effective mode (name + source +
    composed summary) and the available presets. Multi-line → message stream, not
    a `notify` toast.
  - **`"off"`** → `clearActiveMode()` (clears the OVERRIDE; effective falls back to
    the config default per the precedence layer); `ctx.ui.notify` the new effective
    state.
  - **a preset/mode name** → `setActiveMode(arg)` in try/catch; success →
    `ctx.ui.notify('mode set to "<arg>"')`; failure (unknown preset / missing
    fragment — the resolver validates at set-time) → `ctx.ui.notify(err.message,
    "error")`, leaving the prior override intact.
- **Effective-mode display source**: `getEffectiveModeSource()` for the tier;
  the effective spec name = `getActiveMode() ?? getDefaultMode()` (a string preset
  name in the common case); the composed axes via `resolveActiveModePlan().mode`
  (reuse `formatModeSummary`). Wrap the resolve in try/catch so a broken active
  mode renders an error line rather than crashing the listing.
- **Preset list** = `Object.keys(loadPresets()).sort()` (stable display + cycle
  order shared with keybinding-cycle).
- **Owns command-output doc semantics**: a short SPEC note on `/mode` behavior
  (no-arg lists; `<preset>` sets; `off` → default).
- **No child stories.**

## Implementation Units
### Unit 1: `src/commands.ts` — add `registerModeCommand(pi)`
`registerCommand("mode", { description, handler })`. Helpers: `formatModeListing()`
(effective state + preset list → string), reuse `formatModeSummary`. Imports:
`setActiveMode, clearActiveMode, getActiveMode, getDefaultMode,
getEffectiveModeSource, resolveActiveModePlan` from `./resolver.js`; `loadPresets`
from `./presets.js`.
### Unit 2: `extensions/index.ts` — `registerModeCommand(pi)` (additive).
### Unit 3: `tests/mode-command.test.ts` — via `makePi`: command registered as
`"mode"`; extract the handler; with a fixture prompts tree + presets, assert:
no-arg emits a listing (effective + presets); `<preset>` sets the override
(getActiveMode reflects it); `off` clears the override → effective = default;
unknown preset → notify error, override unchanged. Reset resolver/cache/fragment/
presets in `beforeEach`; extend `makePi` to record `registerCommand` (already does)
+ capture `ctx.ui.notify` via a stub ctx.
### Unit 4: `docs/SPEC.md` — `/mode` command-output semantics note.

## Acceptance criteria
- [x] `/mode <preset>` sets the override; `/mode off` falls back to the default;
  `/mode` (no arg) lists effective + presets; unknown preset → graceful error,
  prior override intact. typecheck clean; suite green.

## Implementation notes

- **`src/commands.ts`**: added `registerModeCommand(pi)` (registers command
  `"mode"`) plus the pure helper `formatModeListing(source, specName, mode,
  modeError, presets)` and exports `MODE_COMMAND` / `MODE_LISTING_MESSAGE_TYPE`.
  Handler behavior per design: empty arg → `pi.sendMessage({ customType:"mode",
  content, display:true })` (no `triggerTurn`) with the effective source +
  effective spec name (`getActiveMode() ?? getDefaultMode()`, surfaced only when
  it's a string preset) + composed axes via `formatModeSummary(
  resolveActiveModePlan().mode)` wrapped in try/catch (broken mode → an
  `(unresolvable — …)` line, not a crash) + the sorted preset names
  (`Object.keys(loadPresets()).sort()`); `"off"` → `clearActiveMode()` then a
  `ctx.ui.notify` of the new effective state; a name → `setActiveMode(arg)` in
  try/catch (success → `ctx.ui.notify('mode set to "<arg>"')`, failure →
  `ctx.ui.notify(err.message, "error")`, prior override intact).
- **`extensions/index.ts`**: added `registerModeCommand(pi)` alongside the
  existing handler + inspect + session_start (additive).
- **`tests/mode-command.test.ts`** (new, 7 tests): drives the extracted handler
  with a temp prompts fixture (covering the real `safe` preset's fragments) +
  the real bundled `presets.json`; a notify-capturing ctx stub built on
  `makeContext`. Covers: factory registers `mode`; no-arg listing (effective +
  a real preset name; default-tier label + axes); `<preset>` sets the override
  (`getActiveMode()` reflects it); `off` reverts to default and to unset; unknown
  preset → error notify + override unchanged. `beforeEach`/`afterEach` reset
  resolver/fragment/presets/cache.
- **`tests/registration.test.ts`**: rolled the surface assertion forward to
  `[MODE_COMMAND, MODE_INSPECT_COMMAND]` (still zero tools/shortcuts/flags/
  renderers/providers and no emit at registration) — not weakened.
- **`docs/SPEC.md`**: added the `/mode` command-output semantics note under
  "Switching paths".
- **Harness**: no change needed — `makePi` already records `registerCommand` +
  `sendMessage`.
- typecheck clean; full suite green at **207 tests** (was 200; +7 mode-command).
