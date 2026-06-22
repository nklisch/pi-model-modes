---
id: story-default-command-surface
kind: story
stage: review
tags: [tests]
parent: feature-mode-default-management
depends_on: [story-default-config-writer]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# `/mode default` command surface (commands.ts)

## Source

Parent design `feature-mode-default-management.md`, "Subcommand dispatch
contract" + "Override-still-wins notify" + "Display panel".

Depends on `story-default-config-writer` for `writeDefaultToConfig` and
`readDefaultSources`.

## Deliverable

Extend `/mode` arg parsing in `src/commands.ts` to dispatch a `default`
subcommand. Five forms, all display-only when bare, no `triggerTurn`:

| Form | Effect |
|---|---|
| `/mode default` | Emit 3-line display panel via `readDefaultSources(cwd)` |
| `/mode default <preset>` | Write project; reseed; notify |
| `/mode default <preset> --global` | Write global; reseed; notify |
| `/mode default off` | Clear project; reseed; notify |
| `/mode default off --global` | Clear global; reseed; notify |

### Dispatch contract

Grammar `/mode default [--global] (<preset>|none|off) [--global]`:

- Tokens: split arg on whitespace. After `default`, recognize `<action>` and
  `--global` (position-flexible).
- Reject (error toast, no write): dup `--global`, `--global=value`, mixed-case
  flags, unknown flags, extra positionals, flag-only.
- Bare `/mode default` (no action) → display panel.

### Validate-then-write-then-reconcile

Use the parent writer's full pipeline. The command layer's job:

1. Parse tokens. Bail on parser error (error toast, return).
2. If bare → emit display panel; return.
3. Else call `writeDefaultToConfig(ctx.cwd, action, scope)`.
4. On `{ ok: false }` → error toast naming `error` + `path`; return.
5. On `{ ok: true }` → build notify per "Override-still-wins notify":

   - `effective` source from the writer result; `override` from
     `getActiveMode()`; effective mode from `getEffectiveModeSource()`.
   - Unmasked: `default set to "<v>" (<scope>); effective mode is now "<v>" (default)`
   - Masked: `default set to "<v>" (<scope>) — override "<ov>" still active; /mode off to use it now`
   - Cleared with surviving default: `default cleared (<scope>); effective default is now "<v>" (<source>)`
   - Cleared with no default: `default cleared (<scope>); effective default is (unset)`

6. `refreshModeFooter(ctx)` so the indicator reflects any effective change.

### Display panel (3 lines)

```
Default mode (durable config):
  global:  flow
  project: (unset)
Effective default: flow (global)
```

When no default in either scope: `Effective default: (unset)`. When a file is
unreadable: `global: (unreadable)` rather than crashing.

## Test matrix (tests/mode-command.test.ts)

- Bare panel shows both scopes + effective default + source label.
- `<preset>` writes project; notify wording matches "unmasked" shape.
- `<preset> --global` writes global (verify via `loadPluginConfig`).
- `off` clears project; notify reflects surviving global or unset.
- `off --global` clears global.
- Set-default-under-active-override → override unchanged; "masked" notify wording.
- Unknown preset → error toast; no write (verify file unchanged).
- Parser errors: dup flag, `--global=true`, mixed-case, extra positional,
  flag-only — each gets an error toast and writes nothing.
- All set/off forms refresh the footer (one `setStatus` call).
- Bare form is display-only (no `triggerTurn`).

## Acceptance

- All test-matrix cases pass.
- Existing `/mode <preset>` and `/mode off` behavior unchanged.
- `npm run typecheck` clean; `npm test` green.
