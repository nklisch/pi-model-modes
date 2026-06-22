---
id: story-default-autocomplete-multistage
kind: story
stage: done
tags: [tests]
parent: feature-mode-default-management
depends_on: [story-default-command-surface]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# `/mode default` three-stage autocomplete

## Source

Parent design `feature-mode-default-management.md`, "Autocomplete". Opus
proposal: do NOT broaden `MODE_ARG_TRIGGER`; add two sibling regexes and
dispatch 3→2→1.

Depends on `story-default-command-surface` so the suggested tokens match
what the parser actually accepts.

## Deliverable

Extend `src/autocomplete.ts`:

1. **Top-level builder gain.** Add `default` as a top-level item alongside
   presets + `off` in a NEW builder (e.g. `buildModeTopLevelItems`). Do NOT
   append `default` to `buildModeArgItems` — that breaks the existing
   `length === names.length + 1` assertion at `autocomplete.test.ts:144`
   (Opus medium). Stage 1 dispatches via the new builder.

2. **Two sibling regexes.**

   - Stage 3 (`--global` after an action): `/^\/mode[ \t]+default[ \t]+[^\s]+[ \t]+(--?[^\s]*)$/`
     → suggest `[{ value: "--global", ... }]`.
   - Stage 2 (action after `default`): `/^\/mode[ \t]+default[ \t]+([^\s]*)$/`
     → reuse `buildModeArgItems(registry)` VERBATIM (already yields presets + `off`).

3. **Dispatch.** `getModeArgSuggestions` tries stage 3 → stage 2 → stage 1
   (existing `MODE_ARG_TRIGGER`). They are structurally mutually exclusive
   (trailing-space gates each `$`), so order does not matter for correctness,
   only for early return.

4. **Bare `/mode default <CR>`.** Stage 2 with empty token returns the full
   preset list (preset names + `none` + `off`).

## Test matrix (tests/autocomplete.test.ts)

- Stage 1: `/mode <partial>` still returns presets + `off` + `default`.
- Stage 1: `/mode fl` filters to `flow` only (existing behavior preserved).
- Stage 2: `/mode default fl` returns `[flow]`.
- Stage 2: `/mode default ` (empty token) returns full preset + `off` list.
- Stage 2: does NOT include `default` in suggestions (no `default default`).
- Stage 3: `/mode default flow -` returns `[--global]`.
- Stage 3: `/mode default off --` returns `[--global]`.
- Existing assertion `buildModeArgItems(registry).length === names.length + 1`
  stays green (no `default` appended there).
- Existing `/mode flow extra` → `undefined` (multi-token still delegates).
- Existing delegation paths (non-`/mode` lines, abort signal, non-TUI mode)
  unchanged.

## Acceptance

- All test-matrix cases pass.
- Zero existing autocomplete tests regress.
- `npm run typecheck` clean; `npm test` green.

## Review (2026-06-21)

Verdict: Approve — story verified by implementation tests and final review bundle.

Verification:

- `npm run typecheck` clean
- `npm test` 360/360 passing
- Codex final review did not identify autocomplete blockers.
- Opus final review: PASS WITH NITS; autocomplete invariants preserved.
