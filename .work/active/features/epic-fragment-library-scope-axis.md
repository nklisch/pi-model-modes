---
id: epic-fragment-library-scope-axis
kind: feature
stage: review
tags: [prose]
parent: epic-fragment-library
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Scope Axis Fragments (3)

## Brief

This feature authors the three `prompts/axis/scope/` fragments: `unrestricted`, `adjacent`, `narrow`. Each is one behavioral brief describing how far beyond the immediate task the agent may range.

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

Authored all three `prompts/axis/scope/` fragments — `unrestricted`, `adjacent`,
`narrow` — by adapt-porting from `../claude-code-modes/prompts/axis/scope/`
(all three reference files existed). Each describes how far beyond the immediate
task the agent may range: `unrestricted` = broad latitude to create/reorganize/
build scaffolding; `adjacent` = touch directly-related code and clean up what you
hit, but no project-wide sweeps; `narrow` = only what's literally requested.

Adaptation choices:
- **Stripped CC framing.** The reference had no hard CC self-references in these
  three, but I dropped tool-mechanic phrasing and tightened to pi's voice.
- **pi voice + length.** Matched the existing axis fragments: `# TitleCase`
  heading (not the reference's `# Scope: X`), one or two framing sentences, then a
  tight bullet list — same register as `prompts/axis/agency/*.md`. Overwrote the
  minimal `adjacent` starter with the fuller adapted version.
- **transform-not-replace / additive.** All three describe behavior the splice
  *adds* on top of pi's base; none restate identity, tools, or context.
- **Byte-stable.** No dynamic text, timestamps, or counters — honors Invariant 2.
- Filenames sans `.md` are the exact value names (`unrestricted`/`adjacent`/
  `narrow`) so `discoverAxis("scope")` picks them up by convention.

Verification: `npm test` green (199 passed). The shared `starter-set sanity`
fixture in `tests/fragments.test.ts` tracks the growing library; I updated only
the scope-axis assertion (`adjacent`, `narrow`, `unrestricted`) to its final
authored state. The quality/modifiers/overlay assertions and the total-count line
are owned by sibling content features landing in parallel and were reconciled by
their owners — not weakened here. My commit is race-scoped to the three fragment
files plus this feature item and deliberately excludes the co-owned test file.
