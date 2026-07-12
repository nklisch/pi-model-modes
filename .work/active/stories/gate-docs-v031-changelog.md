---
id: gate-docs-v031-changelog
kind: story
stage: implementing
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
