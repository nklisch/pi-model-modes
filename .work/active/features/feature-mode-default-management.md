---
id: feature-mode-default-management
kind: feature
stage: done
tags: []
parent: null
depends_on: []
release_binding: v0.2.0
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

## Design (locked 2026-06-21 after Codex advisory + Opus adversarial cross-review)

Both reviewers returned SHIP WITH CHANGES. Resolutions below are binding.

### Source-of-truth contract (Opus blocker — load-bearing)

The post-write "re-seed" MUST call `applyDefaultFromConfig(ctx.cwd)` (which
reloads + shallow-merges BOTH files via `loadPluginConfig`). It must NOT
- call `setDefaultMode`/`clearDefaultMode` directly — `/mode default off`
  in project scope while a global default exists must fall back to the
  global value (shallow-merge precedence), and a naive clear would yield
  `unset` with a lying notify.
- call `applySessionStart(...)` — that helper clears the EPHEMERAL override
  on `new`/`resume`/`fork` (config.ts:169-171); invoking it mid-write would
  wrongly drop an active override.

### Write pipeline (Opus high)

Strict **validate → write → reconcile** order with NO early mutation:

1. **Validate** by materializing: call `loadPresets()` + `getPreset(arg)` (or
   accept `none`/`off` literally). If the preset is unknown, error toast and
   return BEFORE any read or write. This never touches the resolver tier.
2. **Read-for-write STRICTLY.** The reader in `config.ts` is tolerant (malformed
   → `{}`); the writer must NOT inherit that, or it would silently overwrite a
   hand-edited broken file. Missing file → `{}`. Malformed/non-object → error
   toast, no write. (Codex high.)
3. **Mutate the loaded object** in memory: `{...loaded, defaultMode: arg}` for
   set; `delete loaded.defaultMode` for `off`. Sibling keys (`cycleKeybinding`,
   future keys) preserved. (Both reviewers.)
4. **Serialize** as `JSON.stringify(obj, null, 2) + "\n"`. 2-space indent +
   trailing newline keeps the file hand-edit-friendly. (Opus medium.)
5. **Atomic write:** `writeFileSync` to `<path>.tmp` in the same dir, then
   `renameSync(tmp, path)`. The reader is tolerant, so a torn concurrent read
   silently degrades to `{}` and drops the default for that `session_start` —
   atomic rename is cheap insurance against that heisenbug. (Both.)
6. **Bootstrap parent dir:** `mkdirSync(dirname(path), { recursive: true })`
   for both project and global scope (global may not exist either on a fresh
   machine). (Codex medium.)
7. **Reconcile** via `applyDefaultFromConfig(ctx.cwd)`. (Opus blocker.)
8. **Write-failure contract:** any `EACCES`/`ENOTDIR`/`EEXIST`-on-rename etc.
   → error toast naming the path; resolver and footer NOT touched. (Codex med.)

### Subcommand dispatch contract (Codex parser)

Grammar: `/mode default [--global] (<preset>|none|off) [--global]`.

- `default`, `off`, `none`, `--global` are lowercase, exact, case-sensitive.
- `--global` may appear before OR after the action token.
- Reject (error toast, no write): duplicate `--global`, `--global=value`,
  mixed-case flags, unknown flags, extra positionals (`flow extra`),
  flag-only (`/mode default --global`), action-only-after-default-bare.
- Bare `/mode default` (no action) → display panel, display-only (no
  `triggerTurn`) — parity with bare `/mode`.

### Autocomplete (Opus proposal — no existing tests break)

Do NOT broaden `MODE_ARG_TRIGGER`. Add two sibling regexes and dispatch
3→2→1 (structurally mutually exclusive — trailing-space gates each `$`):

- **Stage 3:** `/^\/mode[ \t]+default[ \t]+[^\s]+[ \t]+(--?[^\s]*)$/` →
  `[{ value: "--global", label: "--global", description: "…" }]`.
- **Stage 2:** `/^\/mode[ \t]+default[ \t]+([^\s]*)$/` → reuse
  `buildModeArgItems(registry)` VERBATIM (already yields presets + `off`).
- **Stage 1:** `MODE_ARG_TRIGGER` unchanged → NEW top-level builder that
  yields presets + `off` + `default`. Do NOT append `default` to
  `buildModeArgItems` (that breaks the `length === names.length + 1`
  assertion at autocomplete.test.ts:144).
- Bare `/mode default ` with no further input → full preset list.

### Display panel (Opus trim — 3 lines, not 5)

`effective mode` duplicates the bare `/mode` panel; the source label is
mandatory for the global/project merge case. Cut to:

```
Default mode (durable config):
  global:  flow
  project: (unset)
Effective default: flow (global)
```

(When no default in either scope: `Effective default: (unset)`.)

### Override-still-wins notify (Opus, made actionable)

Setting/clearing the default does NOT touch the override tier. Notify
wording makes the gap explicit AND points at the next step:

- Unmasked: `default set to "extend" (project); effective mode is now "extend" (default)`
- Masked: `default set to "extend" (project) — override "safe" still active; /mode off to use it now`
- Cleared: `default cleared (project); effective default is now flow (global)` /
  `default cleared (project); effective default is (unset)`

### Resolver + cache contract reaffirmed

- Override > default > unset precedence unchanged (SPEC:221).
- Cache-stability invariant: set-default-under-active-override changes
  nothing effective → signature stable; set-default-with-no-override is a
  legitimate MISS (mode genuinely changed). (Opus audit: SAFE.)
- No-op-when-unset invariant: `off` on a file with no `defaultMode` writes
  nothing; resolver untouched. (Opus audit: SAFE.)

## Child decomposition (3 stories)

1. `story-default-config-writer` — config.ts: `writeDefaultToConfig(cwd,
   value, scope)` + `readDefaultSources(cwd)`. Atomic tmp+rename, strict
   read-for-write, sibling-key preservation, parent bootstrap, `setConfigPathsForTesting`
   reuse. Tests: round-trip, malformed-no-write, atomicity is verified by the
   tmp-file pattern, both scopes.
2. `story-default-command-surface` (depends on 1) — commands.ts: `default`
   subcommand dispatch, all 5 forms, validate-then-write-then-reconcile
   pipeline, write-failure toasts, override-still-wins notify, 3-line panel.
3. `story-default-autocomplete-multistage` (depends on 2) — autocomplete.ts:
   three-stage dispatch, top-level `default` builder, sibling regexes, no
   existing test regression.

Plus doc roll-forward in `docs/SPEC.md` + `README.md`.

## Cross-review log

- **Codex advisory (in-harness subagent, gpt-5.5/high):** SHIP WITH CHANGES.
  Accepted: durable `none`, strict read-for-write, write-failure contract,
  parser contract, post-write reseed via same merge path. Nice-to-haves
  parked: file paths in bare panel, future `--project` flag symmetry.
- **Opus adversarial (peeragent, opus/xhigh):** SHIP WITH CHANGES. Accepted:
  re-seed-is-`applyDefaultFromConfig` blocker, validate→write→reconcile order,
  reuse path seams, 2-space+newline canonicalization, atomic tmp+rename,
  don't-broaden-`MODE_ARG_TRIGGER`, don't-append-to-`buildModeArgItems`,
  trim panel to 3 lines, actionable override-notify wording. Parked:
  migrate reader+writer to `getAgentDir()` (low; do both or neither).

Both non-blocking on disagreement; consensus findings implemented.

## Implementation notes (2026-06-21)

Implemented all three child stories and advanced them to review:

- `story-default-config-writer`
  - `src/config.ts`: `writeDefaultToConfig`, `readDefaultSources`, `effectiveDefaultSource`, path seam exports.
  - Strict read-for-write, 2-space+newline serialization, tmp+rename atomic write, parent bootstrap, sibling-key preservation, `none` persistence, `applyDefaultFromConfig` reconciliation.
  - Dedicated regression coverage for the Opus blocker: project `off` with global default falls back to global.
- `story-default-command-surface`
  - `src/commands.ts`: `parseModeDefaultArgs`, `formatDefaultListing`, `formatDefaultNotify`, `/mode default` dispatch.
  - Five forms implemented; `--global` position-flexible; parser errors reject before write; unknown presets validate before filesystem touch; active override preserved with actionable notify.
- `story-default-autocomplete-multistage`
  - `src/autocomplete.ts`: top-level `default` builder, stage-2 action suggestions, stage-3 `--global` suggestions.
  - Existing `MODE_ARG_TRIGGER` and `buildModeArgItems` invariants preserved.

Docs rolled forward in `README.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`.

Verification: `npm run typecheck`; `npm test` (350/350).

## Review (2026-06-21)

Verdict: Approve — feature verified by tests + Codex/Opus final review.

Verification:

- `npm run typecheck` clean
- `npm test` 360/360 passing
- Opus final review: PASS WITH NITS; no blockers/high/medium findings.
- Codex final review: initial FAIL on clear-when-empty; accepted and fixed.
- Codex focused re-review: PASS; prior blockers fixed, no new blockers.

Accepted review findings fixed before approval:

- Clear-when-empty now no-ops instead of writing `{}` / creating config paths.
- Command surface now emits `no default set in <scope>` and skips footer refresh
  on no-op clears.
- `/mode:inspect --prompt` now uses a dynamic markdown fence, preventing prompts
  with backtick fences from closing the debug block early.

Rejected/parked nits:

- Inspect parser saying "flag" for a non-dash extra token is cosmetic and not
  worth delaying this feature.
- Stage-3 autocomplete requiring a leading `-` before suggesting `--global` is
  accepted because it follows the locked Opus design.
- ARCHITECTURE test-list staleness predates this work; low-priority cleanup for
  a future docs hygiene pass if desired.
- The commit-message glitch in `3681216` is message-only; rewrite blocked by the
  harness history-mutation guard, and code/substrate state are unaffected.

## Post-approval grouped review follow-up (2026-06-22)

Additional requested GLM 5.2 + Opus grouped reviews over the five feature/story
items found no blockers. Accepted low-cost notification polish nits:

- No-op clears now mention a surviving cross-scope default when one remains
  effective, while still skipping footer refresh and config writes.
- Cleared-default notifications now mention an active override when it still
  masks the exposed default/unset state.
- Setting a global default while both an override and project default mask it no
  longer implies `/mode off` alone will make the global default effective.

Verification after the follow-up: `npm run typecheck`; `npm test` (367/367).
