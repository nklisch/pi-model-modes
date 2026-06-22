---
id: feature-mode-default-management
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

# `/mode default` — manage the durable default from inside pi

## Brief

Add a `/mode default` subcommand family that writes the durable default mode
to the plugin-owned config file (`pi-model-modes.json`) from inside pi, so
the user doesn't have to hand-edit JSON. Mirrors `git config`'s scope model:
project by default, `--global` opts into the user-level file. `off` clears
the default in scope. Bare `/mode default` shows both scopes' current values.

Today the default mode is configurable ONLY by hand-editing
`~/.pi/agent/pi-model-modes.json` (global) or `<cwd>/.pi/pi-model-modes.json`
(project) — there is no in-pi surface for it. `/mode <preset>` only sets the
session override (ephemeral); `/mode off` only clears the override. A user
who wants the same mode every time they start pi must leave pi, edit JSON,
and `/reload`. This feature closes that loop.

## Why a subcommand, not a separate command

The `/mode` command family already owns mode lifecycle (override +
fallback). Default management is the *durable* counterpart to override's
*ephemeral* — same conceptual surface, two tiers. Keeping it under `/mode`
matches the user's mental model and lets autocomplete cover both tiers from
one trigger.

## Scope shape (locked at scope time; design consult before flesh)

### Subcommand surface

| Form | Effect |
|---|---|
| `/mode default` | Display panel: both scopes' current values + effective default source |
| `/mode default <preset>` | Write `defaultMode: "<preset>"` to **project** config + re-seed + notify |
| `/mode default <preset> --global` | Same, but writes **global** config |
| `/mode default off` | Remove `defaultMode` from **project** config + re-seed + notify |
| `/mode default off --global` | Same, but clears **global** config |

### Cross-cutting invariants

- **Override still wins.** Setting/clearing the default does NOT touch the
  ephemeral override tier. If an override is active when the default
  changes, the effective mode is unchanged; the notify message must say so
  (`default set to "extend" (project) — effective still "safe" (override)`).
- **Validate before write.** Unknown preset / missing fragment → error
  toast; the config file is NOT touched (fail-fast, no partial writes).
- **Preserve sibling keys.** The config file may carry `cycleKeybinding`
  and future keys; writing `defaultMode` must round-trip those untouched.
- **Project-config bootstrap.** Writing project config must `mkdir -p
  <cwd>/.pi/` (the dir may not exist on a fresh project).
- **No new files on clear-when-empty.** `off` on a file with no
  `defaultMode` key is a no-op notify (`no default set in <scope>`), not a
  write.

### Autocomplete (multi-stage)

- `/mode <partial>` → presets + `off` + **`default`** (new top-level item)
- `/mode default <partial>` → presets + `off` (NOT `default` —
  `default default` is meaningless)
- `/mode default <preset|off> <--flag>` → `--global`

### Display panel shape

```
Default mode (durable config):
  global:  flow
  project: (unset)
Effective default: flow (global)
Override: none
Effective mode:    flow (default)
```

Single source: `readDefaultSources(cwd)` returns `{ global, project }`;
the effective default + override + effective-mode lines reuse the
existing resolver surface.

## Design questions to settle with cross-model review

1. **Should `--global` also seed the override, or only write+reseed the
   default tier?** Current scope: write+reseed only (override untouched).
   Cross-review to pressure-test.
2. **Notify wording when the override masks the new default.** Current
   scope: explicit dual-line notify. Cross-review for clarity.
3. **Project-config bootstrap race.** Is `mkdirSync(p, { recursive: true })`
   sufficient, or does pi have a config-dir helper we should reuse? Check
   pi's extension surface during design.
4. **Atomicity of file writes.** Plain `writeFileSync` vs. write-to-tmp +
   rename. Current scope: `writeFileSync` (matches existing config-read
   tolerance; the file is small and user-facing, not hot). Cross-review to
   confirm.
5. **Display panel ordering + content.** Five lines is more than the bare
   `/mode` panel — verify it earns its weight.

## Acceptance criteria

- All five forms behave as specified.
- Validation rejects unknown presets with an error toast; no file write.
- Sibling keys (e.g. `cycleKeybinding`) survive a set/clear round-trip.
- Project-config write bootstraps `<cwd>/.pi/` if absent.
- Override + effective mode are reported truthfully in the notify, even
  when the new default is masked.
- Autocomplete covers all three stages (top-level `default`, second-stage
  presets+off, third-stage `--global`).
- Bare `/mode` (no-arg listing) is unchanged.
- `applySessionStart` reconciles correctly after a `/mode default` write
  (next `/reload` re-seeds from the new config without surprise).

## Out of scope

- Editing config keys other than `defaultMode` (future: a generic
  `/mode config set <k> <v>` surface if more keys accumulate).
- Per-mode-fragment editing (parked as `idea-custom-and-dynamic-modes`).
- A `--project` explicit flag (project is the default scope; `--global`
  is the only opt-in).

## Sizing

Multi-stride feature. Decomposes to ~3 stories at design time:
1. `story-default-config-writer` — config.ts write+read helpers + tests
2. `story-default-command-surface` — commands.ts subcommand parsing + dispatch
3. `story-default-autocomplete-multistage` — autocomplete.ts three-stage routing

Plus doc roll-forward in `docs/SPEC.md` + `README.md`.

## Cross-model review plan

Per the operator's request, the design will be cross-reviewed by:
- **Codex** (in-harness `subagent`, different model class from GLM host) —
  advisory/completeness pass on the scope + design before implementation.
- **Opus** (`peeragent`, Claude Code subprocess — also a different model
  class) — adversarial/correctness pass on the fleshed design before
  implementation, and a final review pass after implementation.

Both non-blocking on disagreement; consensus findings get implemented.
