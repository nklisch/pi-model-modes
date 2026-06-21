---
id: epic-scaffold-handler-noop-handler
kind: feature
stage: drafting
tags: [tests]
parent: epic-scaffold-handler
depends_on: [epic-scaffold-handler-package-skeleton]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# No-Op Handler + Test Harness (Invariants 3 and 1)

## Brief

This feature registers the `before_agent_start` handler inside the factory
produced by the sibling skeleton feature, and establishes the always-return
no-op contract plus the test harness every downstream epic extends. The
handler returns `{ systemPrompt: e.systemPrompt }` byte-for-byte on every
call — never `undefined` (pi reads `undefined` as "revert to base," which
would break downstream identity/mode injection, so the always-return
discipline is established here and inherited by every later epic).

It owns two of the three SPEC invariants in their scaffolding form, both as
tests:

- **Invariant 3 (no-op-unset).** With no mode selected and no identity logic
  yet, the handler's return value equals its input byte-for-byte. The test
  invokes the handler with a synthetic `{ systemPrompt, ctx.model }` and
  asserts strict equality.
- **Invariant 1 (clean-base handling), scaffolding form.** A test proving the
  handler treats `e.systemPrompt` as pristine on every call — it never
  mutates the input and never caches a "previous output" to source from
  later. At this stage the handler returns the input unchanged, so the test
  seeds the discipline (assert no mutation, no module-level "last output"
  state sourced into the return) that later epics inherit when splicing
  begins.

It also stands up the test harness — a way to invoke the handler with a
synthetic `{ systemPrompt, ctx.model }` and assert on the return value —
that every downstream epic (identity-injection, mode-composition, etc.)
extends. Without this harness, none of the other invariants or features can
be verified.

This feature does NOT cover: identity derivation, mode resolution, fragment
loading, the `/mode` command, the keybinding, or the per-turn cache. Pure
no-op + harness + the two invariant tests.

## Epic context

- Parent epic: `epic-scaffold-handler`
- Position in epic: **consumer of `epic-scaffold-handler-package-skeleton`** —
  fills in the factory's body to register the handler, adds the handler
  module, the test harness, and the two invariant tests. The skeleton must
  land first so this feature has an entry point to wire into.
- Cross-feature file ownership note: `extensions/index.ts` is created by the
  skeleton feature and extended here. Implementation must edit the factory
  body, not overwrite it.

## Foundation references

- `docs/SPEC.md` — "Integration point: `before_agent_start`" (handler
  signature, return contract), "The three invariants" (Invariants 1 and 3,
  with their test statements), "Cache key and the change signal" (why the
  handler always returns a `systemPrompt`, never `undefined`).
- `docs/ARCHITECTURE.md` — "Components" (`src/handler.ts` as the
  `before_agent_start` entry, `tests/` layout with `noop-unset.test.ts` and
  `clean-base.test.ts`), "Per-turn data flow" (handler's position in the
  pipeline), "Where each invariant is enforced" (no-op-unset in `handler.ts`,
  clean-base sourcing from `e.systemPrompt`).

## Inherited design decisions (from parent epic)

These are locked in the epic's `## Design decisions`; this feature inherits
them and must not re-litigate:

- **Handler return contract**: the handler ALWAYS returns
  `{ systemPrompt: e.systemPrompt }` — never `undefined`. This is the
  load-bearing discipline this feature establishes.
- **Clean-base discipline**: the handler sources from `e.systemPrompt` on
  every call and never from a cached "previous output." No module-level
  mutable "last result" may be read into the return path at this stage.
- **Test framework**: `vitest` (`vitest --run`); pure-unit tests against the
  handler with synthetic events — no live pi session required.

<!-- The design pass on this feature (`/agile-workflow:feature-design`) fills
in the handler module shape, the test-harness helper (synthetic event/ctx
construction), the exact Invariant-3 byte-equality assertion, and the exact
Invariant-1 no-mutation/no-cache-source assertion. -->
