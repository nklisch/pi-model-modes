---
id: story-style-selection-tiers-config
kind: story
stage: implementing
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

- [ ] Style precedence is override → project default → global default → unset.
- [ ] `none` explicitly suppresses style injection at either selection tier.
- [ ] Invalid override/default values degrade or fail at the correct boundary
  without replacing valid prior state.
- [ ] Config refresh preserves an override; new/resume/fork clear it.
- [ ] The available-style catalog is deterministic, reports bundled/custom
  provenance, lets custom registrations win name collisions, and excludes the
  `none`, `off`, and `default` control tokens.
- [ ] Reserved `customStyles` names (`none`, `off`, `default`) warn and degrade
  independently; `writingStyle: "none"` remains suppression, while scalar
  `"off"`/`"default"` values are unknown styles rather than clear operations.
- [ ] Durable style writes are strict, sibling-preserving, atomic, and no-op
  when clearing an absent key.
- [ ] Global writes reject project-only custom registrations.
- [ ] Handler splice/cache-key bytes, style path security, cache behavior, and
  mode config writer behavior remain unchanged for equivalent inputs; fixture
  calls to the superseded `setStyleSelection` API are migrated deliberately.
- [ ] `npm test` and `npm run typecheck` pass.

## Design reference

See `feature-style-command-family` Units 1–2, Testing, and Risks.
