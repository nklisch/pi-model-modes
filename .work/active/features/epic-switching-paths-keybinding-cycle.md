---
id: epic-switching-paths-keybinding-cycle
kind: feature
stage: done
tags: []
parent: epic-switching-paths
depends_on: [epic-switching-paths-config-default]
release_binding: v0.2.0
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Keybinding Cycle (Ctrl+M forward / Shift+Ctrl+M backward)

## Brief

This feature registers the mode-cycle keybinding: `Ctrl+M` cycles **forward**
through the preset list and `Shift+Ctrl+M` cycles **backward**, each setting the
session override (via the resolver seam) relative to the current **effective**
mode (from `config-default`'s state layer). User-rebindable via
`~/.pi/agent/keybindings.json`.

Registration goes in `extensions/index.ts` (edit, don't overwrite). The cycle
start point is the current effective spec; from unset it enters the preset list at
the first preset. This feature OWNS closing the SPEC "Open questions" Ctrl+M
note (verify no collision; documented as the chosen default).

This feature does NOT own the config/precedence (config-default) or the `/mode`
command (mode-command); it reuses the same set-override seam.

## Epic context
- Parent epic: `epic-switching-paths`
- Position: **consumer of config-default; parallel to mode-command.**

## Foundation references
- `docs/SPEC.md` — "Switching paths" (keybinding cycle), "Open questions" (Ctrl+M).
- `docs/ARCHITECTURE.md` — "Components" (`src/keybinding.ts`).
- `src/presets.ts` (preset list to cycle), `src/resolver.ts` (set-override seam);
  the pi `registerShortcut` API (verify against `@earendil-works/pi-coding-agent`).

## Inherited / epic design decisions (do not re-litigate)
- **Ctrl+M forward / Shift+Ctrl+M backward**, user-rebindable; default chosen here
  (SPEC open question closed). Cycle relative to the effective mode.

## Design decisions (resolved during feature-design)

Resolved under autopilot (scope `--all`). Implementation tier: OPUS. Advisory
skipped (the reference `preset.ts` shows the exact `registerShortcut(Key.ctrlShift(
"u"), {handler})` + cycle pattern); codex at the implementation review (shared with
mode-command).

- **`registerModeKeybindings(pi)` in `src/keybinding.ts` (new)**. Registers
  `Key.ctrl("m")` (forward) and `Key.ctrlShift("m")` (backward), each
  `{ description, handler: async (ctx) => {} }`. `Key` is imported from
  `@earendil-works/pi-tui` (per `preset.ts`; the implementor verifies the import is
  resolvable — if `pi-tui` is not a dep, fall back to the `registerShortcut` KeyId
  string form, documenting the choice).
- **Cycle semantics**: `const names = Object.keys(loadPresets()).sort()` (shared
  order with mode-command). Current index = `names.indexOf(<effective preset
  name>)` where the effective name = `getActiveMode() ?? getDefaultMode()` (string
  preset; -1 when unset or an explicit non-preset spec). Forward →
  `names[(idx + 1) % len]`; backward → `names[(idx - 1 + len) % len]`; from
  unset (idx -1) forward enters at `names[0]`, backward at `names[len-1]`.
  `setActiveMode(next)` (the OVERRIDE) then `ctx.ui.notify('mode: <next>')`. Empty
  preset list → notify "no presets" (no-op).
- **Owns closing the SPEC "Open questions" Ctrl+M note**: document Ctrl+M /
  Shift+Ctrl+M as the chosen default (user-rebindable via keybindings.json), the
  open question resolved.
- **No child stories.**

## Implementation Units
### Unit 1: `src/keybinding.ts` (new) — `registerModeKeybindings(pi)` + a pure
`nextPresetName(names, current, dir)` helper (testable without pi).
### Unit 2: `extensions/index.ts` — `registerModeKeybindings(pi)` (additive).
### Unit 3: `tests/keybinding.test.ts` — unit-test `nextPresetName` (forward/back
wrap; from unset; empty list) + a registration test via `makePi` (extend `makePi`
to record `registerShortcut`) asserting two shortcuts registered with handlers.
### Unit 4: `docs/SPEC.md` — close the Ctrl+M open question.

## Acceptance criteria
- [x] Forward/backward cycle through the sorted preset list relative to the
  effective mode, wrapping; from unset enters at the ends; sets the override.
  `nextPresetName` covered (wrap, unset, empty). typecheck clean; suite green.

## Implementation notes

- **`Key` import outcome — FALLBACK used.** `@earendil-works/pi-tui` is NOT a
  resolvable dependency of this plugin: it lives nested under
  `node_modules/@earendil-works/pi-coding-agent/node_modules/...`, not hoisted to
  the project's top-level, so an `import { Key } from "@earendil-works/pi-tui"`
  would not resolve under NodeNext + `verbatimModuleSyntax` (confirmed: a bare
  `require("@earendil-works/pi-tui")` throws MODULE_NOT_FOUND). Per the design's
  documented fallback, the shortcuts are registered with the `KeyId` STRING form
  — `CYCLE_FORWARD_KEY = "ctrl+m"` and `CYCLE_BACKWARD_KEY = "ctrl+shift+m"` —
  which are exactly the strings `Key.ctrl("m")` / `Key.ctrlShift("m")` produce
  and are valid members of pi's `KeyId` union. `tsc` accepts them against
  `registerShortcut(shortcut: KeyId, …)` with no cast, so typecheck stays honest.
- **`src/keybinding.ts`** (new): pure `nextPresetName(names, current, dir)`
  (sorted-list cycle: `indexOf` then `(idx+dir+len)%len`; from unset/non-preset
  enters forward at `names[0]`, backward at `names[len-1]`; empty → `undefined`)
  + `registerModeKeybindings(pi)` registering both shortcuts. Each handler:
  `names = Object.keys(loadPresets()).sort()`; empty → `notify("no presets")`;
  current = `getActiveMode() ?? getDefaultMode()` (string only); `next =
  nextPresetName(...)`; `setActiveMode(next)` + `notify('mode: <next>')`.
- **`extensions/index.ts`**: added `registerModeKeybindings(pi)` (additive, on
  top of Feature 1's edits).
- **`tests/keybinding.test.ts`** (new, 10 tests): pure `nextPresetName` coverage
  (forward/backward wrap, from-unset entry at both ends, non-preset current,
  empty → undefined, single-element self-cycle) + a registration/handler test
  via `makePi` (two shortcuts with handlers; forward-from-unset sets the override
  to the first preset and notifies; backward-from-a-default cycles relative to
  the effective mode). The handler fixture covers EVERY fragment any bundled
  preset references so whichever preset the cycle lands on resolves.
- **`tests/registration.test.ts`**: rolled forward to allow + assert the two
  `registerShortcut` calls (keys = forward/backward, both with handlers); the
  "nothing unexpected" filter now also permits `registerShortcut`. Not weakened.
- **`docs/SPEC.md`**: closed the Ctrl+M "Open questions" item (chosen default,
  user-rebindable) and expanded switching-path #3.
- typecheck clean; full suite green at **217 tests** (was 207 after Feature 1;
  +10 keybinding/registration).

## Review record

**Verdict: Approve** — cross-model codex review (peeragent, --effort high). No
implementation defects.
Codex confirmed: `nextPresetName` handles wrap / unset / empty; handlers cycle
relative to `getActiveMode() ?? getDefaultMode()`; the `"ctrl+m"`/`"ctrl+shift+m"`
KeyId fallback is valid (pi-tui not hoisted) with no cast. One test-strength nit
fixed (exact effective-relative assertion). registration.test still constrains the
surface. 217 tests green. Advanced review → done.
