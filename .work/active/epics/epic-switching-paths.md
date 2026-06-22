---
id: epic-switching-paths
kind: epic
stage: done
tags: []
parent: null
depends_on: [epic-mode-composition]
release_binding: v0.2.0
gate_origin: null
created: 2026-06-20
updated: 2026-06-20
---

# Mode Switching Paths

## Brief

This epic makes modes selectable by the user through three paths that converge
on one resolver: a `/mode` command family, a config default, and a keybinding
cycle. All three resolve to the same `{ base, agency, quality, scope,
modifiers[] }` the engine consumes.

Resolution precedence is fixed: **session override (`/mode`) > config default
> unset.** The config default lives in `~/.pi/agent/settings.json` or
`.pi/settings.json` under a `mode` key and persists across sessions; the
session override is ephemeral (module state, not disk) so a new session
restarts from the config default.

The three paths:

1. **`/mode <name|preset>`** — interactive. `/mode` with no arg shows current
   mode and available presets; `/mode off` clears the override (falls back to
   config default or unset).
2. **Config default** — the `mode` key, durable.
3. **Keybinding** — cycles forward (and shifted, backward) through the preset
   list. Default binding (Ctrl+M candidate) is chosen at implementation time
   to avoid keymap collisions.

This epic is command/keybinding plumbing on top of the engine — it depends on
`epic-mode-composition` for the resolver contract but is fully independent of
`epic-fragment-library`'s content. The two can be fanned out in parallel once
the engine lands.

This epic does NOT author fragment content, change the engine, or implement
`/mode:inspect` (that ships under `epic-identity-injection` with the change
signal).

## Foundation references

- `docs/SPEC.md` — "Switching paths" (the three paths, precedence, persistence
  model), "Open questions" (Ctrl+M candidate — verify no collision).
- `docs/ARCHITECTURE.md` — "Components" (`src/resolver.ts`, `src/commands.ts`,
  `src/keybinding.ts`), "Per-turn data flow" (step 1: resolve active mode).
- `docs/VISION.md` — "What success looks like" (switching a mode measurably
  changes disposition within one turn).

## Anticipated child features

- `feature-mode-command` — the `/mode` family (no-arg listing, `<preset>`,
  `off`); writes the session override.
- `feature-config-default` — read the `mode` key from settings; the
  override > default > unset resolver chain.
- `feature-keybinding-cycle` — register the cycle keybinding; forward and
  backward through presets.

<!-- The design pass on each child feature fills in real specifics.
Do not treat these as commitments. -->

## Design decisions

- **Config storage**: Plugin-owned config file. The plugin reads
  `~/.pi/agent/pi-model-modes.json` (global) and `.pi/pi-model-modes.json`
  (project, overrides global) for `{ defaultMode, injectIdentity, ... }`,
  merging them itself. Fully plugin-owned, namespaced, no collision, no
  dependence on pi's closed `Settings` type.

  **This decision SUPERSEDES `docs/SPEC.md`'s "Switching paths" section**,
  which assumed a `mode` key in `settings.json`. Grounding showed pi's
  `Settings` interface is closed (fixed keys, no index signature, no
  plugin-namespace hook — verified in `dist/core/settings-manager.d.ts`);
  `settings.json` passthrough is unsupported, untyped, and collision-prone.
  The feature-design pass MUST roll `SPEC.md` and `ARCHITECTURE.md` forward to
  reflect plugin-owned config (rolling-foundation: docs describe current
  truth, not past).
- **Default keybinding**: `Ctrl+M` cycles forward through the preset list,
  `Shift+Ctrl+M` backward. User-rebindable via `~/.pi/agent/keybindings.json`.
  Low-stakes and reversible, so defaulted here rather than asked; revisit if a
  collision is detected in the user's keymap (SPEC open question, now closed).
- **Resolution precedence** (confirmed from SPEC): session override (`/mode`)
  > config default > unset. Override is ephemeral (module state, not disk);
  config default is durable; a new session restarts from the config default.

## Decomposition (realized)

Three features, refined by a codex decomposition advisory. DAG:
`config-default → {mode-command, keybinding-cycle}` (the two consumers parallelize).

- `epic-switching-paths-config-default` — plugin-owned config read/merge + the
  **effective-mode state layer** (distinct default vs override; effective =
  `override ?? default ?? unset`) + session-start seeding; owns the SPEC/ARCHITECTURE
  roll-forward (plugin config supersedes the closed-`Settings` assumption) —
  depends on: `[]`
- `epic-switching-paths-mode-command` — the `/mode` family (no-arg shows effective
  mode + source + presets; `<preset>` sets override; `off` falls back to default);
  owns command-output doc semantics — depends on: `[config-default]`
- `epic-switching-paths-keybinding-cycle` — Ctrl+M forward / Shift+Ctrl+M backward
  cycle relative to the effective mode; closes the Ctrl+M SPEC open question —
  depends on: `[config-default]`

### Other agent review (codex)
Accepted: `config-default` must own a REAL default/override seam, not just config
reads — the resolver's single `activeSpec` would make `/mode off` unable to fall
back if default were seeded via `setActiveMode`. So config-default introduces the
distinct-tier effective-mode layer. The shared effective-mode source/formatter
(needed by `/mode` no-arg, the cycle start, and the `/mode:inspect` preset-name
line) lives in this layer. Doc roll-forward split: config-default owns config +
precedence; keybinding owns Ctrl+M docs; mode-command owns command-output semantics.

## Epic completion

All three child features are `done`. Modes are now user-selectable through the
three paths that converge on the resolver's effective-mode state:

- `config-default` — plugin-owned config (`pi-model-modes.json`, global + project
  merge) + the two-tier resolver state (override > default > unset; `/mode off`
  falls back to the default) + `session_start` seeding + SPEC/ARCHITECTURE
  roll-forward (plugin config supersedes the closed-`Settings` assumption).
- `mode-command` — the `/mode` family: no-arg lists the effective mode + presets;
  `<preset>` sets the override; `off` falls back to the default; unknown → graceful
  error with the prior override intact.
- `keybinding-cycle` — Ctrl+M forward / Ctrl+Shift+M backward cycling the sorted
  preset catalog relative to the effective mode; the SPEC Ctrl+M open question is
  closed.

**Behavior delivered:** session override > config default > unset precedence, with
ephemeral overrides and a durable config default; user-rebindable cycling. Each
child was cross-model codex-reviewed. **Verification:** typecheck clean; 217 tests
green.

## Epic review record

**Verdict: Approve.** All children done and reviewed (codex cross-model). The
effective-mode state layer (the codex-advised default/override tiering) ties the
three paths together; foundation docs roll forward to plugin-owned config. Advanced
implementing → done.
