---
id: epic-fragment-library-agency-axis
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

# Agency Axis Fragments (4)

## Brief

This feature authors the four `prompts/axis/agency/` fragments: `autonomous`, `collaborative`, `surgical`, `partner`. Each is one behavioral brief describing the agency disposition (how much initiative the agent takes).

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

Landed the full set of four agency-axis fragments, each one focused behavioral
brief (short heading + a few bullets) describing the agency disposition:

- `prompts/axis/agency/autonomous.md` — full autonomy; act on best judgment, fix
  adjacent breakage, report after the fact.
- `prompts/axis/agency/collaborative.md` — thinking partner; plan-before-change,
  present trade-offs, share reasoning, summarize.
- `prompts/axis/agency/surgical.md` — exactly what was asked; no adjacent fixes,
  minimal blast radius, verify in isolation.
- `prompts/axis/agency/partner.md` — pair of equals; commit on craft, defer on
  direction, keep mental models in sync, surface assumptions.

**Source adapted:** ported from `../claude-code-modes/prompts/axis/agency/*.md`.
Stripped Claude-Code-specific framing (the "Agency: X" heading prefix, "Claude
Code"/self-references, CC tool-list mechanics) and fit pi's transform-not-replace
model — these are additive briefs spliced into pi's existing prompt, so they do
not restate tools/identity/context pi already owns. Matched the voice/length of
the prior minimal `autonomous.md` starter (overwritten with the full version).
No dynamic text or timestamps — the splice stays byte-stable. Filenames equal the
resolver value names (autonomous/collaborative/surgical/partner).

**Verification:** `npm test` green (199 passed / 16 files). The
`tests/fragments.test.ts` starter-set sanity block was reconciled (concurrently
with sibling content features) so the agency axis now asserts its full
four-value, filename-sorted set; the cross-axis count and per-path
non-empty/trimmed invariants remain intact.

## Review record

**Verdict: Approve** — [prose] content feature, fresh-context content review.

A fresh-context reviewer verified the authored fragments against the locked
constraints: no leaked Claude-Code framing (whole-tree grep clean), no dynamic
text / timestamps / counters, no tool/identity/context restatement, value names
match the SPEC sets exactly, and (for base-overlays) the overlays are genuinely
thin tone-setters with a coherent base.json. The fragments load via the
convention discovery and the real-root starter-set sanity test asserts the full
24-fragment catalog. 199 tests green. Advanced review → done.
