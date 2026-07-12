---
id: story-style-command-ui-autocomplete
kind: story
stage: implementing
tags: []
parent: feature-style-command-family
depends_on: [story-style-selection-tiers-config]
release_binding: null
gate_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Add `/style` command UI, autocomplete, and documentation

## Scope

Implement Units 3–5 from the parent feature design on top of the completed
style-tier/config contract: add the `/style` session/default command family,
display-only status/catalog panels, truthful notifications, live multi-stage
TUI autocomplete, factory wiring, inspect provenance, and rolling docs.

## Acceptance criteria

- [x] `/style`, `/style <name|none>`, `/style off`, and `/style default ...`
  implement the exact grammar and tier semantics in the parent design;
  `default none` persists suppression and `default off` deletes the key.
- [x] No-argument panels are display-only and show selection plus fragment
  provenance without triggering an agent turn.
- [x] Unknown names, malformed flags, and config failures preserve previous
  state and report precise errors.
- [x] Three-stage autocomplete includes bundled/custom names and delegates every
  non-style, failure, abort, and non-TUI path.
- [x] `/mode:inspect` reports command-selected style provenance accurately;
  `StyleInspectInfo` and its exact-string test table distinguish selection source
  from renamed fragment source.
- [x] Style commands do not change active mode or the mode-only footer.
- [x] README, SPEC, and ARCHITECTURE describe the final command/config model and
  explicitly limit styles to conversational communication—not code, comments,
  docs, tools, autonomy, scope, or problem-solving strategy.
- [x] Factory and integration tests enumerate `STYLE_COMMAND`, the additional
  TUI autocomplete `session_start` handler, and no unintended Pi seams.
- [x] `npm test` and `npm run typecheck` pass.

## Design reference

See `feature-style-command-family` Units 3–5, Testing, and Risks.

## Implementation notes

- Execution capability: raised/high (caller override). The story adds a public
  command/config grammar, live layered autocomplete, provenance UI, and rolling
  documentation; direct reading covered the bounded existing seams without
  exploratory dispatch.
- Review weight: standard (source: caller/default note); preserved for the
  review stage.
- Added pure shared scalar-default parsing and case-insensitive filtering, then
  retained `/mode` behavior through its existing regression matrix.
- Added `src/style-command.ts` for display-only panels, session/default
  mutations, strict writer adaptation, and masking-aware notifications; style
  paths never refresh mode footer state.
- Added `src/style-autocomplete.ts` as a live-catalog, TUI-only layered provider
  that delegates nonmatches, aborts, discovery failures, completion application,
  and file-completion decisions.
- Migrated inspect to independent `selectionSource` and `fragmentSource` fields
  and removed the temporary `StylePlan.source` compatibility projection after
  all consumers/tests moved.
- Wired `/style` plus the third `session_start` handler in the package factory;
  integration coverage proves command selection changes the next prompt/cache
  reason while preserving mode/footer state.
- Rolled README, SPEC, and ARCHITECTURE forward to the two-tier command/config
  model and explicitly excluded code, comments, docs, tools, autonomy, scope,
  and problem-solving strategy from style authority.
- Tests added: `tests/style-command.test.ts`,
  `tests/style-autocomplete.test.ts`, and
  `tests/style-autocomplete-seam.test.ts`; existing inspect, config, style, and
  factory tests were migrated/extended without weakening assertions.
- Discrepancies from design: none. One safe inspect correction was included:
  `/mode:inspect --prompt` no longer mislabels a style assembly failure as a
  mode-resolution failure.
- Adjacent issues parked: none.

## Verification

- `npm test` — 28 files, 464 tests passed.
- `npm run typecheck` — passed.
- `git diff --check` — passed.
- Test-integrity inspection — no skipped/only tests, placeholder assertions, or
  deleted behavioral coverage; legacy `StylePlan.source` assertions were
  migrated to the authoritative provenance field.

## Review findings (2026-07-12)

**Verdict**: Request changes

**Blocking correction**:
- Add a regression test for the adjacent inspect fix: when style assembly fails
  but mode resolution succeeds, `/mode:inspect --prompt` must report the style
  and prompt assembly failure without mislabeling `Mode:` as unresolvable.

**Review context**: standard weight; cross-model GLM 5.2 deep review over commit
`3810220`; independent verification was green (464 tests and typecheck). The
implementation itself was judged correct; only regression protection is missing.
