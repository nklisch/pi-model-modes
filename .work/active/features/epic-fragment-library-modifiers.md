---
id: epic-fragment-library-modifiers
kind: feature
stage: done
tags: [prose]
parent: epic-fragment-library
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Modifier Fragments (~11)

## Brief

This feature authors the `prompts/modifiers/` fragments: `bold, tdd, debug, flow, muse, readonly, methodical, director, speak-plain, context-pacing, playful`. Each is one short modifier brief (zero or more apply per mode).

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

Authored all 11 modifier fragments under `prompts/modifiers/`:
`bold, tdd, debug, flow, muse, readonly, methodical, director, speak-plain,
context-pacing, playful`. Each adapt-ported from the corresponding
`../claude-code-modes/prompts/modifiers/*.md`, distilled to ONE focused brief
(heading + a few lines of prose) to match the `tdd.md` starter voice/length.

Adaptation choices:
- **Stripped CC framing** — no tool names, no "Claude Code"/"Claude" self-refs, no
  CC-specific mechanics. `director` keeps the orchestration essence ("hands on the
  wheel, not the keyboard", delegate-and-verify, quality gate) but drops the
  Opus/Sonnet/Haiku model-selection table, which is Claude-specific. `debug`/`flow`/
  `muse`/`methodical` shed their long worked `<example>` blocks; the behavioral
  thesis is carried by prose alone to stay short and byte-stable.
- **Transform-not-replace fit** — every brief is additive behavioral guidance and
  restates no tools, identity, or context (the base/axis layers own those). `readonly`
  and `speak-plain` (DEEP) preserve their operative rules since those *are* the
  behavior, not restated scaffolding.
- **No dynamic text/timestamps** — all content is static; the splice stays byte-stable.
- Filename sans `.md` is the value name; the set matches `docs/SPEC.md`'s modifier
  list exactly (11 values).

Verification: `npm test` green (199/199). The real-package-root sanity test in
`tests/fragments.test.ts` previously asserted modifiers == `["tdd"]` (the starter
state this feature supersedes); reconciled honestly to assert the full
filename-sorted set of 11. No assertion was weakened — it now encodes the completed
library. (That test file is owned/contended by sibling axis/overlay features and is
NOT part of this feature's commit paths.)

## Review record

**Verdict: Approve** — [prose] content feature, fresh-context content review.

A fresh-context reviewer verified the authored fragments against the locked
constraints: no leaked Claude-Code framing (whole-tree grep clean), no dynamic
text / timestamps / counters, no tool/identity/context restatement, value names
match the SPEC sets exactly, and (for base-overlays) the overlays are genuinely
thin tone-setters with a coherent base.json. The fragments load via the
convention discovery and the real-root starter-set sanity test asserts the full
24-fragment catalog. 199 tests green. Advanced review → done.
