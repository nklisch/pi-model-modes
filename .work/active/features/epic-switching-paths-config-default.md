---
id: epic-switching-paths-config-default
kind: feature
stage: drafting
tags: []
parent: epic-switching-paths
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Config Default + Effective-Mode State (override > default > unset)

## Brief

This is the **foundation** feature of switching-paths: it establishes the
plugin-owned config and the **effective-mode state layer** the command and
keybinding features build on. Per the epic's locked decision, config is
plugin-owned (NOT pi's closed `Settings`): the plugin reads
`~/.pi/agent/pi-model-modes.json` (global) and `.pi/pi-model-modes.json`
(project, overrides global), merging them, for `{ defaultMode, ... }`.

Critically (per the codex decomposition advisory): the engine's resolver today
has a SINGLE `activeSpec`. Seeding the default through `setActiveMode(default)`
would make the default indistinguishable from a session override, so `/mode off`
could not fall back correctly. This feature therefore introduces a real
**default/override seam** so the effective mode is `override ?? default ?? unset`
— distinct `default` and `override` tiers, with the resolver's existing
active-mode seam representing the *effective* selection. It seeds the default at
`session_start`, and exposes an effective-mode source (override / default /
unset) the `/mode` no-arg display, the keybinding cycle start, and the
`/mode:inspect` preset-name line consume.

This feature OWNS rolling `docs/SPEC.md` + `docs/ARCHITECTURE.md` forward: the
"Switching paths" SPEC section assumed a `mode` key in `settings.json`; pi's
`Settings` type is closed (no plugin namespace), so plugin-owned config
supersedes it (rolling-foundation — docs describe current truth).

This feature does NOT implement `/mode` (mode-command) or the keybinding
(keybinding-cycle); it provides the config + precedence + effective-mode state
they manipulate.

## Epic context
- Parent epic: `epic-switching-paths`
- Position: **foundation — no deps; mode-command + keybinding-cycle depend on it.**

## Foundation references
- `docs/SPEC.md` — "Switching paths" (precedence + persistence; this feature rolls
  the settings.json assumption forward to plugin-owned config).
- `docs/ARCHITECTURE.md` — "Components" (`src/resolver.ts`; a small config/mode-state
  module), "Per-turn data flow" (step 1: resolve active mode).
- `src/resolver.ts` (landed) — the active-mode seam this layers over.

## Inherited / epic design decisions (do not re-litigate)
- **Plugin-owned config** (`~/.pi/agent/pi-model-modes.json` + project), merged;
  supersedes the SPEC settings.json assumption — roll SPEC + ARCHITECTURE forward.
- **Precedence**: session override (`/mode`) > config default > unset. Override is
  ephemeral (module state); default is durable (config). New session restarts from
  the default.
- **Effective-mode state layer** (codex advisory): distinct default vs override so
  `/mode off` falls back to the default, not to unset. Expose the effective spec +
  its source.
