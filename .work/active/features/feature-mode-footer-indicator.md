---
id: feature-mode-footer-indicator
kind: feature
stage: drafting
tags: []
parent: null
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Mode indicator in the TUI footer

## Brief

Show the effective mode — the same composed state `getEffectiveModeSource()` /
`resolveActiveModePlan()` already hold — as a persistent indicator in pi's TUI
footer, so the user can see at a glance what behavioral shape the next turn
will take without running `/mode` or `/mode:inspect`.

Today, mode state is *internal*: it lives in module state in `src/resolver.ts`
and is surfaced only through the `/mode` listing panel (display-only, no
turn), `/mode:inspect` (a diagnostic), and the ephemeral toast that fires when
a mode is set. Between those, the user has no way to remember which mode is
active while typing. The system-prompt transform fires every turn — the user
just can't see which transform is being applied. This feature closes that gap.

The natural surface is `ctx.ui.setStatus("pi-model-modes", <summary>)` —
pi's footer status slot. It updates on mode change and on session/model
boundaries, and renders nothing when mode is unset (or in non-TUI modes:
print/json/rpc degrade gracefully).

## Scope

In scope:
- A pure render helper that formats the effective mode into a one-line footer
  string (mirrors `formatModeSummary` in `src/commands.ts`; may share or wrap
  it).
- A thin pi seam that pushes the formatted string to `ctx.ui.setStatus` at
  the moments the effective mode can change:
  - `before_agent_start` (per-turn refresh — also covers the cache-miss /
    change-signal path the handler already runs).
  - `session_start` (initial render + post-reseed reconciliation).
  - `model_select` (identity component changes; the footer string includes
    identity per `/mode:inspect` precedent — see Open question below).
  - Inside the `setActiveMode` / `clearActiveMode` paths the `/mode` command
    and the cycle keybinding already invoke, so the footer updates the moment
    a mode is selected rather than waiting for the next turn.
- No-op behavior when `ctx.hasUI` is false (print/json modes) and when no
  mode is active (clears the slot, or renders a faint "mode: unset" — see
  Open question).

Out of scope:
- A status-line *widget* (`ctx.ui.setWidget`) above the editor — the footer
  slot is enough for v1; a richer widget can come later.
- Surfacing the cache key / change-signal last-reason in the footer (that
  detail belongs to `/mode:inspect`).
- Any change to identity injection, resolver tiering, or the cache contract.

## Strategic decisions

None at the vision/spec/architecture layer. The mode state already exists;
this is a presentation surface on top of it. SPEC Invariant 2 (cache
stability) and the no-op-unset contract are untouched — the footer reads
state, it does not join the assembly path.

## Open questions (for feature-design to resolve)

- **Composed axes vs preset name in the footer.** Long form
  (`base:pi • agency:autonomous • quality:architect • scope:unrestricted`) is
  informative but eats footer width; short form (`mode: partner`) is glanceable
  but loses the axes when an explicit-override composition is active. Likely a
  short default with hover/inspect for detail, but the trade-off is a
  feature-design call.
- **Identity in the footer.** `/mode:inspect` shows the derived identity line;
  the footer probably shouldn't duplicate it (pi already shows the model
  elsewhere in the chrome). Confirm during design.
- **Unset rendering.** Empty slot vs `mode: unset` vs subtle placeholder.
- **When mode is unresolvable** (broken active mode — `modeError` path in
  `commands.ts`). The footer should degrade to a clear `(unresolvable)` marker
  rather than silently showing stale state.

## Dependencies

None. Reads existing resolver / cache / commands modules; adds a new
presentation module + registration in `extensions/index.ts`.

## Next

`/agile-workflow:feature-design` picks this up at `stage: drafting`. Designs
the render helper, the update-trigger set, and the four open questions above,
then spawns child stories (likely: render-helper story,
wiring/registration story, optional identity-degradation story) with
`depends_on` chains and advances to `stage: implementing`.
