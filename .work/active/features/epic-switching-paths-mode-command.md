---
id: epic-switching-paths-mode-command
kind: feature
stage: drafting
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
