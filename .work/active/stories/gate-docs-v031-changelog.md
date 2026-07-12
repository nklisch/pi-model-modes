---
id: gate-docs-v031-changelog
kind: story
stage: review
tags: [documentation]
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: docs
created: 2026-07-12
updated: 2026-07-12
---

# Add the v0.3.1 changelog entry

## Drift category
changelog-gap

## Location
- Doc: `CHANGELOG.md`
- Code: `src/style-command.ts`, `src/style-autocomplete.ts`, `src/style.ts`, `src/config.ts`

## Reality
v0.3.1 ships the public `/style` command family, autocomplete, two-tier selection, durable config writes, and inspect provenance.

## Required edit
Prepend a concise v0.3.1 entry during release-deploy's changelog phase; preserve current-truth wording and group logical changes rather than commits.

## Implementation notes

- Prepended a grouped `v0.3.1 — 2026-07-12` entry covering the `/style`
  command family, autocomplete, two-tier durable selection and writes,
  provenance, regression coverage, and documentation updates.
- Preserved the existing v0.3.0 and earlier entries without commit-by-commit
  detail.

## Verification

- Changelog audit: the new v0.3.1 heading is immediately below `# Changelog`,
  and the existing v0.3.0 entry remains intact below it.
- Transitioned to `stage: review` after the in-place documentation update.
- Review polish: added the two new v0.3.1 reusable patterns to the Documentation
  section so the entry matches the pattern-catalog precedent from v0.3.0.
