---
id: gate-docs-refresh-pattern-citations
kind: story
stage: implementing
tags: [documentation]
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: docs
created: 2026-07-12
updated: 2026-07-12
---

# Refresh pattern-catalog citations shifted by writing styles

## Drift category
Pattern-skill-staleness

## Location
- Docs: `.agents/skills/patterns/{resolver-throw-graceful-degrade,pure-core-thin-pi-seam,stateful-module-reset-for-testing,enoent-tolerant-read-rethrow}.md`
- Code: `src/{commands,cache,config}.ts`

## Current doc text
The pattern files cite pre-feature line numbers such as `src/commands.ts:416`, `src/cache.ts:231`, and `src/config.ts:402`.

## Reality
The writing-style implementation shifted the referenced definitions. Current anchors include `renderModeInspect` at `src/commands.ts:162`, resolver surfaces around `:444/:586`, cache state/reset at `src/cache.ts:96/:242`, and config read/override/reset at `src/config.ts:71/:513/:522`.

## Required edit
Refresh only the stale citations to current source lines. Regenerate the patterns index/digest if the pattern gate changes its entry block; do not add historical prose.
