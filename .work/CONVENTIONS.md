# Conventions

Project-specific configuration for the agile-workflow substrate in this repo.
The plugin's canonical behavior lives in the agile-workflow SPEC; this file
captures the choices that vary per project.

## Release mapping

`tag-based` — releases are tagged git tags (`vMAJOR.MINOR.PATCH`). A release
late-binds all unbound archived items and collapses bound items into one
`.work/releases/<version>/release-<version>.md` summary. Done items carry
`archived_atop` (the tag they were done atop) and `git_ref` for provenance.

## Tag taxonomy

A plugin-tuned set scoped to this project's risks (a pi extension that
modifies system prompts). Tags are lowercase, applied freely; the two
marked **routing** change which design skill an item routes to.

- `security` — system-prompt injection, prompt-cache integrity, extension-API
  misuse, anything that could let input or fragments steer the model
  unsafely. The highest-stakes surface in this plugin.
- `tests` — the three SPEC invariants (clean-base handling, cache stability,
  no-op-unset) and any other test scaffolding. The invariants are the
  contract; their tests are load-bearing.
- `refactor` **(routing)** — behavior-preserving structural change only.
  Renames, fragment/preset layout reorganization, dead-code removal. Routes
  to `refactor-design`. Apply the black-box test: if any observable behavior
  changes for a caller of the public surface, this is NOT a refactor — drop
  the tag.
- `perf` **(routing)** — throughput, latency, memory. Routes to
  `perf-design`. In this project, mostly the per-turn assembly path and
  cache-hit behavior.
- `docs` — foundation docs (`docs/VISION.md`, `docs/SPEC.md`,
  `docs/ARCHITECTURE.md`) and fragment-authoring guidance.
- `patterns` — recurring prompt-fragment shapes worth a `.agents/skills/patterns/`
  entry once observed 3+ times (e.g. the base-overlay shape, the
  axis-value shape). Discovery is `gate-patterns`'s job at release time.

## Slug conventions

Kebab-case, parent-prefixed for children. Examples:

- Epic: `epic-mode-composition`
- Feature (child of epic): `feature-fragment-library`
- Story (child of feature): `story-fragment-cache-loader`

## Stage overrides

None. Items follow the default stage machine:
`pending → in_progress → completed` (work), with the substrate stages
`drafting → implementing → review → done` for design/implement/review flow.

## Gate config

`gates_for_release: [security, tests, cruft, docs, patterns]`

Default gate finding routing:

- `critical` / `high` → `implementing` (must fix before release ships)
- `medium` → `drafting`
- `low` → `backlog`
- `info` → `skip`

`binding_guard: warn` — surfaces cross-version binding-consistency findings
without halting the release.

`epic_cohesion: phased` — an unbound child of a bound parent is informational;
an epic may ship across releases.

`gate-refactor` is **not** enabled (no scan-rule libraries under
`.agents/skills` yet). Add it if/when project-specific refactor scan rules
are authored.

## Terminal-tier retention

`delete-refs`
