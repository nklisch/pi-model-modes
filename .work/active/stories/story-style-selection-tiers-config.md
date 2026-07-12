---
id: story-style-selection-tiers-config
kind: story
stage: review
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
