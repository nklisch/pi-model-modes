---
id: gate-patterns-v0.3.1
kind: story
stage: done
tags: [patterns]
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: patterns
created: 2026-07-12
updated: 2026-07-12
---

# Patterns extracted for v0.3.1

## New patterns codified
- `content-derived-cache-signatures` — hash resolved prompt content into cache identity.
- `validate-before-commit-state` — validate candidates before changing in-memory or durable state.

## Inconsistencies flagged
- `gate-patterns-config-custom-styles-warning`
- `gate-patterns-command-seam-thinning`

Out-of-bundle scanner observations in `src/cache.ts` and `src/fragments.ts` were rejected because release gates may not expand beyond bundle changes.

## Pattern files written
- `.agents/skills/patterns/content-derived-cache-signatures.md`
- `.agents/skills/patterns/validate-before-commit-state.md`
- `.agents/skills/patterns/SKILL.md`
- `.agents/rules/patterns.md`
