---
id: epic-fragment-library-base-overlays
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

# Base Voice Overlays + base.json

## Brief

This feature authors `prompts/base/` voice overlays and the `base.json` manifest. A base overlay is a THIN tone-setter — one short paragraph shifting register/emphasis (e.g. `chill` = calm pacing, `flow` = calm-plus-engaged). The default base is pi's own (passthrough, no file). `base.json` declares slot order (load-bearing). At minimum ship a couple of real overlays (e.g. `chill`, `flow`) alongside the pi-default passthrough.

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

Shipped three base voice overlays, each a single short paragraph (thin
tone-setter — no tool/identity/context restatement; pi owns those):

- `prompts/base/chill.md` (`chill`) — calm, unhurried pacing; lower urgency.
  Adapted from the essence of `../claude-code-modes/prompts/chill/core.md`,
  stripped to its tone (steady confidence, fail-as-information, settledness).
- `prompts/base/flow.md` (`flow`) — calm-plus-engaged, sustained focus. Adapted
  from `../claude-code-modes/prompts/flow/core.md` (awake attention, complexity
  as the part worth sinking into, calm appetite).
- `prompts/base/pi-direct.md` (`pi-direct`) — kept the starter as the "direct"
  tone (plain, lead-with-the-answer). Coherent thin overlay; retained.

`prompts/base.json` updated to `{"overlays":["base/chill.md","base/flow.md",
"base/pi-direct.md"]}`. Manifest order = splice order. The `PI_BASE` default
("pi" = pi's own voice) stays a NO-file passthrough — not listed in base.json.

No dynamic text/timestamps; the splice stays byte-stable. Reconciled the
`tests/fragments.test.ts` starter-set sanity case: the stale single-`pi-direct`
base-overlay assertion now asserts the shipped trio in manifest order (chill,
flow, pi-direct). `npm test` green (199 passed).

## Review record

**Verdict: Approve** — [prose] content feature, fresh-context content review.

A fresh-context reviewer verified the authored fragments against the locked
constraints: no leaked Claude-Code framing (whole-tree grep clean), no dynamic
text / timestamps / counters, no tool/identity/context restatement, value names
match the SPEC sets exactly, and (for base-overlays) the overlays are genuinely
thin tone-setters with a coherent base.json. The fragments load via the
convention discovery and the real-root starter-set sanity test asserts the full
24-fragment catalog. 199 tests green. Advanced review → done.
