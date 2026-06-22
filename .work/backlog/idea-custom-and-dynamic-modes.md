---
id: idea-custom-and-dynamic-modes
kind: story
stage: drafting
tags: []
parent: null
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Custom + dynamic user-defined modes (à la Claude Code modes)

## Source

Operator request during the `/mode default` design session, 2026-06-21.

## The idea

Today the mode space is fixed: a built-in preset table (`presets.json`)
composing `base × agency × quality × scope + modifiers`, all authored as
fragment files shipped with the package. Claude Code lets users define
their own modes; we want the equivalent here.

Two related capabilities were mentioned:

1. **Custom modes (static).** A user can declare their own presets and/or
   their own fragments (a new base voice, a new agency value, a new
   modifier) without forking the package. Likely plugin-owned config
   surfaces: `~/.pi/agent/pi-model-modes/` (fragments) +
   `pi-model-modes.json` (preset table overlay), project-scoped mirror
   under `<cwd>/.pi/`. Loader merges user fragments/presets over built-ins
   with a documented precedence.

2. **Dynamic modes via commands.** Modes that are well-formed (valid base +
   axes + modifiers) but assembled at runtime through a slash command,
   e.g. `/mode new my-debug base=chill agency=surgical modifiers=debug,tdd`
   → registered for the session (ephemeral) or saved (durable). This is the
   composition engine exposed interactively, not a new fragment format.

## Why it fits this plugin

The composition engine (`src/assemble.ts`, `src/resolver.ts`,
`src/fragments.ts`) already builds modes from axes + fragments; both
capabilities are extensions of the loader + a new write surface, not a
rewiring. The `/mode` command family and autocomplete already enumerate
presets, so custom/dynamic modes plug into existing display + switching
paths once the registry learns about non-built-in entries.

## Open questions for scope/design time

- **Fragment authoring UX.** Markdown-only? A small DSL for axis values
  that take parameters (e.g. a `director` modifier parameterized by intent)?
- **Naming + collisions.** How user presets/fragments override or extend
  built-ins of the same name; warn-on-shadow vs. error-on-collision.
- **Persistence scope.** Ephemeral session-only dynamic modes vs. saved to
  project vs. saved globally — likely the same `--global` /
  project-default shape `/mode default` is establishing.
- **Validation.** Reuse `setDefaultMode`/resolver's fail-fast for
  well-formedness at creation time.
- **Discoverability.** Custom modes appear in `/mode` (no-arg listing),
  autocomplete, and the footer just like built-ins.

## Sizing

Not estimated — multi-feature arc. Decompose at scope time (likely:
custom-fragments feature, custom-presets feature, dynamic-mode-command
feature, with shared loader-merge work as a parent story).
