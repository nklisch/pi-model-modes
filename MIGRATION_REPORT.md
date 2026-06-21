# Migration Report — pi-model-modes

Bootstrap of the agile-workflow substrate. Single-commit migration.

## Source shape

**greenfield** — no source code at bootstrap; only `docs/` (foundation
documents) and a stray `.pi/subagents.json`. No prior tracking artifacts.

## Foundation docs detected (preserved, read-only)

- `docs/VISION.md` — the two gaps pi leaves (no model identity, no behavioral
  range); what this plugin is, who it's for, success criteria.
- `docs/SPEC.md` — the hard contract: the three invariants
  (clean-base handling, cache stability, no-op-unset), `before_agent_start`
  integration, cache-key formula, identity line spec, mode composition,
  switching paths.
- `docs/ARCHITECTURE.md` — component/file layout, per-turn data-flow
  diagram, fragment library, the two caches, invariant-enforcement map.

Foundation docs roll forward in place through `scope` / `design` /
`implement` — never through bootstrap. Convert did not modify them.

## Items seeded by tier

None. Greenfield bootstrap seeds an empty skeleton; epic/feature/story
decomposition is the next step (see *Next steps*).

## Classified artifact inventory (Phase 1.7 sweep)

| Artifact | Classification | Action |
|---|---|---|
| `docs/VISION.md`, `SPEC.md`, `ARCHITECTURE.md` | foundation docs | preserved (read-only) |
| `.pi/subagents.json` | unrelated (pi session config) | left untouched |
| legacy tracking docs (`TODO.md`, `BACKLOG.md`, `ROADMAP.md`, etc.) | not present | n/a |
| agent entrypoints (`AGENTS.md`, `CLAUDE.md`, nested variants) | none present pre-bootstrap | created root `AGENTS.md` |
| skill roots (`.agents/skills/`, `.claude/skills/`) | not present | n/a |
| `.claude/rules/*.md` | not present | n/a |

No convergence candidates. No `bespoke` overlaps, no
`plugin-mirror-divergent-copy` entries.

## Entrypoint model

`agents-canonical` — default (no `CLAUDE.md` existed, so the Claude-native
toggle was never triggered). Root `AGENTS.md` is the canonical instruction
file, created fresh with the slim agile-workflow section.

## Bespoke overlaps converged

None.

## Reference-integrity actions

None. No moves, removes, or replacements performed (greenfield, preserve-only).

## Cleanup scope

`preserve-only` — no legacy artifacts to clean up. No destructive ops.

## Files written this run

- `.work/CONVENTIONS.md` — project conventions (tag-based releases,
  plugin-tuned tag taxonomy, default gates, `delete-refs` retention).
- `.work/active/{epics,features,stories}/` — empty tier directories.
- `.work/backlog/`, `.work/releases/`, `.work/archive/`, `.work/bin/` —
  empty tier directories.
- `.work/bin/work-view` — version-stamped bash fallback (`work-view 0.14.4`).
  See note below.
- `.agents/rules/agile-workflow.md` — plugin-managed dense behavioral rules
  (tag semantics, test integrity, advisory review, entry points), between
  `<!-- agile-workflow:rules:start/end -->` markers.
- `AGENTS.md` — canonical instruction file with the slim agile-workflow
  substrate section between `<!-- agile-workflow:start/end -->` markers.

## Notes

- **work-view binary skew.** The plugin's prebuilt Rust binary at
  `work-view/dist/x86_64-unknown-linux-musl/work-view` reports version
  `0.14.2`, but `plugin.json` declares `0.14.4`. The installer rejects the
  stale prebuilt and, due to an installer control-flow bug (it `return 1`s
  on prebuilt-version-mismatch instead of falling through to the bash
  fallback when `target_triple` succeeds), exits without trying the
  fallback. The version-stamped **bash fallback** (`scripts/work-view.sh`,
  self-reporting `0.14.4`) was installed directly as `.work/bin/work-view`.
  It satisfies all `work-view` query needs except the `/agile-workflow:board`
  interactive board (which requires the Rust binary's `board` subcommand). To
  restore board support: rebuild/retag the prebuilt binaries to `0.14.4`, or
  fix the installer's fallback control flow.

## Conventions chosen (summary)

| Convention | Value |
|---|---|
| Release mapping | `tag-based` |
| Tag taxonomy | plugin-tuned: `security, tests, refactor, perf, docs, patterns` |
| Slug convention | kebab-case, parent-prefixed |
| Stage overrides | none |
| Gates for release | `[security, tests, cruft, docs, patterns]` |
| Gate finding routing | default (critical/high→implementing, medium→drafting, low→backlog, info→skip) |
| `binding_guard` | `warn` |
| `epic_cohesion` | `phased` |
| `gate-refactor` | not enabled (no scan-rule libraries yet) |
| Terminal-tier retention | `delete-refs` |
| Entrypoint model | `agents-canonical` |
| Cleanup scope | `preserve-only` |

## Next steps

1. **Commit the bootstrap** — this migration is staged as a single commit
   (see below).
2. **Run `/agile-workflow:epicize`** — decompose the foundation docs into
   epics with declared dependencies. Suggested epic seeds from the docs:
   - *Scaffold extension + handler* (package skeleton, `before_agent_start`
     registration, no-op pass-through).
   - *Identity injection + tests* (read `ctx.model`, derive line, cache key,
     cache-stability invariant test).
   - *Fragment library + presets* (base/axis/modifier markdown,
     `presets.json`, loader).
   - *Switching paths* (`/mode` command, config default, keybinding cycle,
     unified resolver).
   - *Inspect command* (`/mode:inspect` reading the change-signal ring
     buffer).
3. **Then implement** via `/agile-workflow:implement-orchestrator` once
   epicized, or autopilot through the queue.
