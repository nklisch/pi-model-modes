---
id: epic-fragment-library-quality-axis
kind: feature
stage: done
tags: [prose]
parent: epic-fragment-library
depends_on: []
release_binding: v0.2.0
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Quality Axis Fragments (3)

## Brief

This feature authors the three `prompts/axis/quality/` fragments: `architect`, `pragmatic`, `minimal`. Each is one behavioral brief describing the quality bar.

Voice/source per the epic's locked decisions: adapt-port from
`../claude-code-modes`, stripping Claude-Code-specific framing (tool lists,
"Claude Code" self-references, CC mechanics) and fitting pi's
transform-not-replace model. Each fragment is ONE focused behavioral brief
(heading + short prose), no dynamic text/timestamps (the splice is byte-stable).
The `fragment-loader` already shipped a minimal STARTER file per type; this
feature fills out the full set, replacing/extending the starter where needed so
discovery picks them up by convention.

This feature authors content ONLY — it does not change the engine, resolver, or
cache. No-code-surface ([prose]).

## Epic context
- Parent epic: `epic-fragment-library`
- Position: **independent content authoring; parallel with the other content
  features. `preset-bundles` depends on this (its presets reference these files).**

## Foundation references
- `docs/SPEC.md` — "Mode composition" (the value lists + assembly order).
- `docs/ARCHITECTURE.md` — "Fragment library" (layer semantics, convention dirs).
- `src/fragments.ts` (landed) — the loader these files feed (convention discovery,
  filename = value name).

## Inherited / epic design decisions (do not re-litigate)
- **Adapt-port from `../claude-code-modes`**, fit transform-not-replace, strip CC
  framing.
- **Base overlays are thin tone-setters** (one short paragraph; no tool/identity/
  context restatement) — applies to base-overlays.

## Authoring notes

Authored the three quality-axis fragments at `prompts/axis/quality/`:
`architect.md`, `pragmatic.md` (overwrote the minimal starter), and `minimal.md`.

- **Adapt-port from `../claude-code-modes/prompts/axis/quality/`.** Each reference
  file was a multi-section Claude-Code brief (Code structure / Error handling /
  Documentation and types / Output communication, naming JSDoc, tool framing,
  Claude-Code self-references). Distilled each to ONE focused behavioral brief —
  heading + one short paragraph — matching the voice/length of the existing
  `pragmatic` starter and pi's transform-not-replace model (additive; restates no
  tools/identity/context). Filename sans `.md` is the value name
  (`architect`/`pragmatic`/`minimal`), exactly per `src/fragments.ts` discovery
  and the `docs/SPEC.md` quality set.
- **Behavioral essence preserved.** architect = build for years (right
  abstractions, cohesive modules, real edge cases, WHY-comments, explain
  structural calls); pragmatic = match the codebase, improve where contained,
  abstract only at a clear immediate payoff, ship-over-perfect; minimal =
  smallest correct change, no speculative work, guard only real boundaries.
- **No dynamic text/timestamps** — byte-stable splice (SPEC Invariant 2).
- **Verification:** `npm test` green (199 passing). The shared
  `tests/fragments.test.ts` "starter-set sanity" block was being concurrently
  updated by sibling axis/overlay workers (the shared-index race the brief
  flagged). Reconciled the quality slice honestly: pinned the per-axis exact name
  list to `[architect, minimal, pragmatic]` (filename-sorted) and updated the
  total-paths literal to the SPEC-complete `24`. Per the race-safe commit
  instruction, this test file is NOT included in this feature's commit (committed
  separately by the worker that owns the shared file).

## Review record

**Verdict: Approve** — [prose] content feature, fresh-context content review.

A fresh-context reviewer verified the authored fragments against the locked
constraints: no leaked Claude-Code framing (whole-tree grep clean), no dynamic
text / timestamps / counters, no tool/identity/context restatement, value names
match the SPEC sets exactly, and (for base-overlays) the overlays are genuinely
thin tone-setters with a coherent base.json. The fragments load via the
convention discovery and the real-root starter-set sanity test asserts the full
24-fragment catalog. 199 tests green. Advanced review → done.
