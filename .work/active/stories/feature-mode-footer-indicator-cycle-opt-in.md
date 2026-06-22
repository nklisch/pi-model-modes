---
id: feature-mode-footer-indicator-cycle-opt-in
kind: story
stage: review
tags: []
parent: feature-mode-footer-indicator
depends_on: [feature-mode-footer-indicator-footer-render]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Cycle-keybinding opt-in (`cycleKeybinding` config flag + factory wiring)

## Scope

Implement **Unit 2** of `feature-mode-footer-indicator`. Introduce the
`cycleKeybinding` boolean config flag (default `false`) so users can opt into
BOTH the cycle keybinding AND the footer hint in one place. When `true` at
factory load (read from GLOBAL config only — keybindings register at load
before `cwd` is known, and keybindings are global in pi anyway), the factory
calls `registerModeKeybindings(pi)` (which today is exported but uncalled) and
sets the footer hint signal via `setCycleHintEnabled(true)`.

This is the enabling path the `keybinding-cycle` epic deliberately left open:
it preserves SPEC's "No mode-cycle keybinding is registered by default"
invariant (default is still off) while making the cycle keybinding + footer
hint reachable without a custom extension. Without it, the footer hint (Unit 1)
would advertise a shortcut that does not fire.

Depends on Unit 1 (`feature-mode-footer-indicator-footer-render`) because the
factory imports `setCycleHintEnabled` from `src/footer.ts`.

## Units

- `src/config.ts` (extend):
  - add `cycleKeybinding?: boolean` to `PluginConfig`;
  - add `loadGlobalPluginConfig()` that reads ONLY `globalConfigPath()`
    (refactor `loadPluginConfig`'s `readConfigFile` out so both share it);
  - tolerant validation — missing → `false`, non-boolean → `console.warn` +
    `false`, NEVER throws (matches `defaultMode`'s pattern).
- `extensions/index.ts` (extend the factory) — read
  `loadGlobalPluginConfig().cycleKeybinding`; when `=== true`, call
  `registerModeKeybindings(pi)` AND `setCycleHintEnabled(true)`. Additive to
  the existing handler/command/session_start registrations.
- `tests/config.test.ts` (extend) — `loadGlobalPluginConfig` reads only the
  global file (via `setConfigPathsForTesting`); tolerant of missing /
  non-boolean `cycleKeybinding`.
- `tests/registration.test.ts` (extend) — default → no shortcuts + hint signal
  false; flag on (via a global config fixture) → two shortcuts registered
  (`ctrl+shift+u`, `ctrl+shift+alt+u`) + hint signal true. The existing "does
  not auto-register mode-cycle shortcuts" assertion becomes a "default: no
  shortcuts" test — the default-off property is STILL asserted (not weakened).
- `docs/SPEC.md` + `docs/ARCHITECTURE.md` (roll forward) — document the
  `cycleKeybinding` config flag and its gating of BOTH the keybinding
  registration AND the footer hint. The "no default cycle keybinding"
  invariant is preserved (default off); the flag is the opt-in.

## Acceptance criteria

- [x] `loadGlobalPluginConfig` reads ONLY the global config file (assert via
  `setConfigPathsForTesting` that the project file is not consulted).
- [x] `cycleKeybinding` validation: missing → `false`; `true` → `true`;
  non-boolean (e.g. `"yes"`, `1`) → `console.warn` + `false`; NEVER throws.
- [x] Factory: with global `{ "cycleKeybinding": true }`, registers the two
  cycle shortcuts AND calls `setCycleHintEnabled(true)`. With missing / false /
  non-boolean, registers no shortcuts and leaves the hint signal `false`.
- [x] `registerModeKeybindings` is called at most once per process (the
  factory runs once).
- [x] `registration.test.ts`: default-off property still asserted (no
  shortcuts when flag absent); new flag-on test asserts both shortcuts + the
  hint signal.
- [x] SPEC + ARCHITECTURE updated: the `cycleKeybinding` flag is documented as
  the opt-in for cycle keybindings + footer hint; the "no default cycle
  keybinding" invariant is preserved (default off).
- [x] typecheck clean; tests green.

## Implementation notes

- Added `cycleKeybinding?: boolean` and `loadGlobalPluginConfig()` in
  `src/config.ts`; the loader reads only the global path and normalizes missing
  / invalid values to `false`, warning for non-booleans.
- Wired the factory to enable the footer hint and register
  `registerModeKeybindings(pi)` only when global `cycleKeybinding === true`.
- Extended config and registration tests for global-only reads, tolerant
  validation, default-off shortcut behavior, and flag-on shortcut + hint
  behavior.
- Rolled `docs/SPEC.md` and `docs/ARCHITECTURE.md` forward with the current
  global opt-in contract.
- Verification: `npm run typecheck`; `npm test`.

## Out of scope

- The footer render function itself — Unit 1 (this story only imports
  `setCycleHintEnabled` from it; do not modify `src/footer.ts`).
- Wiring the refresh triggers — Unit 3.
- Honoring project-level `cycleKeybinding` — explicitly out of scope
  (documented limitation: keybindings register at factory load before `cwd` is
  available; keybindings are global in pi anyway).
