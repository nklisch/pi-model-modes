---
id: feature-style-command-family
kind: feature
stage: drafting
tags: []
parent: null
depends_on: []
release_binding: null
gate_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# `/style` command family

## Brief

Make writing styles discoverable and switchable from Pi without hand-editing
`pi-model-modes.json`. Add a dedicated `/style` command family because writing
style is orthogonal to working mode: modes govern how the agent approaches the
work, while styles govern how it communicates with the user.

The command family should mirror `/mode`'s two-tier interaction model. A normal
selection is an ephemeral session override for experimentation; a `default`
subcommand manages durable project or global configuration. The no-argument
command is a display-only status and catalog panel, and TUI autocomplete makes
all valid actions and style names discoverable.

## Scope

In scope:
- `/style` displays the effective style, its source tier, and the available
  bundled and registered custom styles.
- `/style <name>` sets a validated session override immediately.
- `/style none` explicitly disables writing-style injection for the session.
- `/style off` clears only the session override and reveals the effective
  configured default, if any.
- `/style default` displays global, project, and effective durable selections.
- `/style default <name|none> [--global]` writes the selected scope while
  preserving sibling config keys and applies the result immediately.
- `/style default off [--global]` removes `writingStyle` from the selected
  config scope and applies the newly effective value immediately.
- TUI autocomplete covers style names, `none`, `off`, `default`, and
  `--global` at the appropriate grammar stages.
- `/mode:inspect` continues to report the effective style after command-driven
  changes.
- Foundation docs and user documentation describe the command surface and the
  style/mode boundary.

Out of scope:
- Creating, editing, importing, or deleting custom style files through Pi.
  `customStyles` registration remains config-file-managed.
- An interactive TUI picker; the first version uses the project's established
  display-panel, autocomplete, and toast patterns.
- Adding writing style to the persistent mode footer.
- Any change to mode composition or the bundled style texts.

## Strategic decisions

- **Command home**: use a standalone `/style` family, not `/mode style` — style
  is an orthogonal communication layer and should not appear to be a working
  mode axis.
- **Persistence model**: mirror modes — plain `/style <name>` is an ephemeral
  session override; `/style default ...` manages durable project/global
  configuration.
- **No-argument experience**: show effective status and the complete catalog,
  with source information, in one display-only panel; autocomplete supports the
  faster selection path.
- **Behavioral boundary**: writing style affects only user-facing conversational
  communication across interactions. It must not alter code style, code
  comments, authored project documentation, implementation strategy,
  problem-solving approach, autonomy, tool use, or edit scope.

## Dependencies

None. The style resolver, secure custom-style registry, config scopes, command
rendering conventions, strict config writer pattern, and multi-stage TUI
autocomplete already exist. This feature extends those established seams.

## Design notes

Design should preserve the existing distinctions between `none` and `off`:
`none` is an explicit higher-precedence no-style selection, while `off` removes
that tier and falls back. It should also preserve custom-style provenance when
a session override selects a name whose effective registration comes from the
project or global config.
