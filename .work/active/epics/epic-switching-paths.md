---
id: epic-switching-paths
kind: epic
stage: drafting
tags: []
parent: null
depends_on: [epic-mode-composition]
release_binding: null
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
