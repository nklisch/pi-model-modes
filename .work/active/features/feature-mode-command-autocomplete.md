---
id: feature-mode-command-autocomplete
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

# `/mode` autocomplete

## Brief

Make `/mode` arguments discoverable. As the user types after the `/mode`
slash command, pi's autocomplete layer surfaces the available preset names
(`default`, `flow`, `safe`, `create`, ...) plus the literal `off`, each with
a one-line description, so the user can pick from a known list instead of
recalling preset names or running `/mode` (no-arg) first.

Today `/mode <name>` requires the user to know preset names by heart. This
feature surfaces them inline so the fast path (typed preset selection) is as
discoverable as the slow path (`/mode` no-arg → read → re-type).

(The companion cycle-keybinding hint that originally lived here has moved to
`feature-mode-footer-indicator` — the footer's persistent visibility is a
better home than this command's no-arg listing.)

## Scope

In scope:
- **Autocomplete.** Register an `addAutocompleteProvider` on `session_start`
  (TUI mode only — guard on `ctx.mode === "tui"`) that:
  - Triggers after the literal `/mode ` token (with trailing space).
  - Returns preset names + the literal `off`, each with a label + description
    sourced from `loadPresets()` and a small static description for `off`.
  - Filters by the partial token after `/mode ` (e.g. `/mode fl` → `flow`).
  - Delegates to the underlying provider for everything else.
- **Tests.** The autocomplete provider's `getSuggestions` filter logic is
  pure given the preset list + cursor text, fully unit-testable.

Out of scope:
- Custom autocomplete for other commands (`/mode:inspect`, etc.) — only
  `/mode` and its `<preset>` argument.
- Any change to resolver state, command surface semantics, or the existing
  no-arg listing layout beyond appending one line.
- An in-line preview of the selected preset's axes inside the autocomplete
  UI (would be nice but depends on autocomplete-item rendering pi may not
  expose).

## Strategic decisions

None. The preset list, the cycle keybinding, and the `/mode` command family
already exist; this is a discoverability layer on top.

## Open questions (for feature-design to resolve)

- **Autocomplete description sourcing.** Presets today are `{base, agency,
  quality, scope, modifiers}` — there's no human description field. The
  autocomplete item description can either be the composed axes summary
  (`flow · autonomous · pragmatic · adjacent · +flow`) or a new optional
  `description` field added to `presets.json`. Composed summary is
  zero-cost and informative enough for v1.
- **Should `/mode:inspect` also get autocomplete?** Probably not — it takes
  no argument. Confirm and skip.
- **Filter behavior on `off`.** The literal `off` clears the override; it
  should appear in the suggestion list, but it's not a preset. Decide
  whether to surface it always or only when the user has typed `o`.

## Dependencies

None. Both the keybinding constants (`src/keybinding.ts`) and the preset
table (`src/presets.ts`) already exist; this consumes them.

## Next

`/agile-workflow:feature-design` picks this up at `stage: drafting`. Designs
the autocomplete provider (trigger condition, item shape, filter), the
hint-line placement, resolves the four open questions, and spawns child
stories (likely: autocomplete-provider story, listing-hint story) with
`depends_on` chains and advances to `stage: implementing`.
