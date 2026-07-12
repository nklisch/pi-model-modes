---
id: story-style-selection-tiers-config
kind: story
stage: done
tags: []
parent: feature-style-command-family
depends_on: []
release_binding: null
gate_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Add style selection tiers and durable config management

## Scope

Implement Units 1–2 from the parent feature design: evolve `src/style.ts` to
hold an ephemeral override over a scoped durable default while retaining the
merged custom-style registry, then add safe `writingStyle` read/write and
session-lifecycle reconciliation in `src/config.ts`.

This story owns the domain and filesystem contracts only. It does not register
`/style` or autocomplete.

## Acceptance criteria

- [x] Style precedence is override → project default → global default → unset.
- [x] `none` explicitly suppresses style injection at either selection tier.
- [x] Invalid override/default values degrade or fail at the correct boundary
  without replacing valid prior state.
- [x] Config refresh preserves an override; new/resume/fork clear it.
- [x] The available-style catalog is deterministic, reports bundled/custom
  provenance, lets custom registrations win name collisions, and excludes the
  `none`, `off`, and `default` control tokens.
- [x] Reserved `customStyles` names (`none`, `off`, `default`) warn and degrade
  independently; `writingStyle: "none"` remains suppression, while scalar
  `"off"`/`"default"` values are unknown styles rather than clear operations.
- [x] Durable style writes are strict, sibling-preserving, atomic, and no-op
  when clearing an absent key.
- [x] Global writes reject project-only custom registrations.
- [x] Handler splice/cache-key bytes, style path security, cache behavior, and
  mode config writer behavior remain unchanged for equivalent inputs; fixture
  calls to the superseded `setStyleSelection` API are migrated deliberately.
- [x] `npm test` and `npm run typecheck` pass.

## Design reference

See `feature-style-command-family` Units 1–2, Testing, and Risks.

## Implementation notes

- Evolved `src/style.ts` into a two-tier state module with validate-before-assign
  override/default APIs, separate selection and fragment provenance, cloned
  registries, and a deterministic custom-over-bundled catalog. Retained the
  legacy `StylePlan.source` field as a compatibility projection for the
  existing inspect path while adding the authoritative `fragmentSource` field.
- Reconciled style config independently from mode config. Scalar project values
  mask global values even when invalid, while malformed custom registrations
  warn and degrade per entry. Reserved control names are rejected during config
  seeding; `writingStyle: "off"` and `"default"` remain unknown scalar values.
- Extracted the strict sibling-preserving atomic scalar writer shared by mode
  defaults and writing-style defaults. Style writes validate scope visibility
  before disk mutation, preserve active overrides, reconcile immediately, and
  no-op when clearing an absent key. Global writes cannot select project-only
  custom fragments.
- Migrated style fixtures from the superseded `setStyleSelection` seam to the
  tier APIs and added coverage for precedence, provenance, catalog collisions,
  lifecycle, writer safety, reserved names, and scope validation.

## Verification

- `npm test` — 25 files, 427 tests passed.
- `npm run typecheck` — passed.
- `git diff --check` — passed.

## Dispatch and review notes

- Execution capability: raised (Luna/high), as dispatched; direct-read design
  required no exploratory fanout.
- Review weight: standard (source: default), preserved for the review stage.
- No deviations or blockers remain for the dependent command/UI story.

## Correction notes (2026-07-12)

- Resolved the standard review blocker with positive config coverage proving a
  valid globally registered custom style can be written as the global durable
  default, while preserving the registration and resolving the resulting
  `custom-global` plan.
- Applied safe owned-surface cleanup: `StyleDefaultSource` now has one source
  of truth in `src/style.ts`, and `noStylePlan` requires explicit selection
  provenance so future callers cannot silently label `none` as an override.
- Deliberately deferred removal of the temporary `StylePlan.source`
  compatibility projection: its consumers are in the dependent command/
  inspect story, which is outside this correction's owned surface.

## Correction evidence (2026-07-12)

- `npm test` — 25 files, 428 tests passed.
- `npm run typecheck` — passed.
- `git diff --check` — passed.

## Review findings (2026-07-12)

**Verdict**: Request changes

**Blocking correction**:
- Add positive coverage proving a globally registered custom style can be
  written as the global default. Existing tests cover rejection of a
  project-only custom style but not acceptance of a valid global registration.

**Safe adjacent cleanup accepted from review**:
- Make `noStylePlan` selection provenance explicit rather than defaulting
  `none` to `override` for future callers.
- Keep `StyleDefaultSource` in one module and filter reserved names consistently
  during write validation.
- Remove temporary compatibility/source result aliases where the parent design
  already requires the dependent command story to migrate consumers.

**Review context**: standard weight; cross-model GLM 5.2 deep review over commit
`4852ade`; integrated verification was green (427 tests and typecheck).

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none remaining; the positive global-custom regression gap was
fixed in `135846a` and verified by a targeted cross-model re-review.
**Nits**: the temporary `StylePlan.source` compatibility projection remains
until the dependent command/inspect story migrates its consumers, as designed.

**Notes**: Standard-weight deep review with a GLM 5.2 cross-model pass, followed
by a focused fresh re-review after correction. Independent integrated
verification passed: 25 files, 428 tests, and TypeScript typecheck. Interim
foundation-doc drift is explicitly owned by Unit 5 of the dependent story and
must be cleared before the parent feature can complete.
