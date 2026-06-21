---
id: epic-scaffold-handler
kind: epic
stage: drafting
tags: [tests]
parent: null
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-20
updated: 2026-06-20
---

# Scaffold Extension + No-Op Handler

## Brief

This epic delivers the smallest thing that proves the plugin integrates with
pi correctly: a pi-package skeleton that loads, registers a `before_agent_start`
handler, and returns pi's assembled prompt unchanged.

It establishes two of the three SPEC invariants as enforceable contracts from
day one:

- **Invariant 3 (no-op-unset).** With no mode selected and no identity logic
  yet, the handler returns `{ systemPrompt: e.systemPrompt }` byte-for-byte.
  Baseline pi behavior is preserved exactly.
- **Invariant 1 (clean-base handling), scaffolding form.** The handler treats
  `e.systemPrompt` as pristine on every call — it does not yet splice anything,
  but the discipline (never source from a cached "previous output") is baked
  into the handler's shape so later epics inherit it.

It also stands up the test harness — a way to invoke the handler with a
synthetic `{ systemPrompt, ctx.model }` and assert on the return value —
that every downstream epic extends. Without this, none of the other
invariants or features can be verified.

This epic does NOT cover identity derivation, mode composition, fragment
loading, or any user-facing command. It is pure integration scaffolding.

## Foundation references

- `docs/SPEC.md` — "Extension model," "Integration point: `before_agent_start`,"
  "The three invariants" (Invariants 1 and 3).
- `docs/ARCHITECTURE.md` — "Components" (`extensions/index.ts`, `src/handler.ts`),
  "Per-turn data flow" (the handler's position in the pipeline).
- `docs/VISION.md` — "What this is not" (pure in-process extension, no
  subprocess).

## Anticipated child features

- `feature-package-skeleton` — `package.json` with `pi` manifest, TypeScript
  config, the `extensions/index.ts` default export that registers the handler.
- `feature-noop-handler` — the `before_agent_start` handler returning
  `{ systemPrompt: e.systemPrompt }`; the test harness asserting byte-equality.
- `feature-clean-base-discipline` — a test proving the handler never mutates
  or caches `e.systemPrompt` as "previous output" (the seed of Invariant 1).

<!-- The design pass on each child feature fills in real specifics.
Do not treat these as commitments. -->
