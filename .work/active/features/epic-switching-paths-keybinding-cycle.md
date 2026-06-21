---
id: epic-switching-paths-keybinding-cycle
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
