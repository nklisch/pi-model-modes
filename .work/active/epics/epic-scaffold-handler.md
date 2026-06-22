---
id: epic-scaffold-handler
kind: epic
stage: done
tags: [tests]
parent: null
depends_on: []
release_binding: v0.2.0
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

## Decomposition

Split by capability: the skeleton ("can pi discover and load this package?")
and the handler discipline ("does it correctly no-op and never cache?") are
distinct test surfaces with a clean producer/consumer seam — the skeleton
produces the loadable package, the entry-point factory signature, and the
`@earendil-works/pi-coding-agent` + `typebox` peer-dep type surface; the
handler feature consumes that factory to register the `before_agent_start`
hook. The provisional third candidate (`feature-clean-base-discipline`) was
collapsed into the handler feature: at this scaffolding stage the clean-base
discipline is a property of the same no-op handler that owns the
Invariant-3 byte-equality test (one handler, one harness, both invariant
assertions), so a standalone 1-2 unit feature would slice too thin.

### Child features

- `epic-scaffold-handler-package-skeleton` — `package.json` with `pi`
  manifest, tsconfig, `extensions/index.ts` default-export factory shell,
  peer-dep declarations; proves pi discovers and loads the package — depends
  on: `[]`
- `epic-scaffold-handler-noop-handler` — the `before_agent_start` handler
  always returning `{ systemPrompt: e.systemPrompt }`; the synthetic-event
  test harness; Invariant-3 byte-equality and Invariant-1 clean-base
  discipline tests — depends on:
  `[epic-scaffold-handler-package-skeleton]`

### Decomposition risks

- **Co-owned file `extensions/index.ts`.** The skeleton feature creates the
  factory; the handler feature extends its body to register the hook. Two
  sequential features touch one file. Mitigation: the handler feature's
  brief flags this (edit, don't overwrite), and the linear `depends_on`
  edge serializes them so no merge conflict is possible.
- **Manifest correctness gates everything downstream.** The package-skeleton
  manifest shape (pi key, `keywords: ["pi-package"]`, peer-dep ranges) must
  be exactly right or pi won't load the extension — and no sibling epic can
  register anything until it loads. Mitigation: the skeleton feature's brief
  carries the exact pi-discovery constraints so its design pass inherits
  them rather than rediscovering them.

## Design decisions

Grounded in pi's installed source (no user input needed — these fall out of
how pi loads and runs extensions):

- **Language and build**: Ship TypeScript source; no compile/build step.
  pi loads `.ts` extensions directly via `jiti` (on-the-fly transpile —
  verified in `dist/core/extensions/loader.js`, `createJiti` import at line
  13, `jiti.import` at line 299). Matches the `.ts`-native layout already in
  `docs/ARCHITECTURE.md`.
- **Runtime**: Node ≥ 22.19.0 (pi's `engines`). The extension itself adds no
  Bun dependency.
- **Test framework**: `vitest` (`vitest --run`), matching pi's own test
  script. Tests are pure-unit against the handler and pure modules — no live
  pi session required (per ARCHITECTURE's unit-testability property).
- **Imports**: The extension imports the `ExtensionAPI` and types from
  `@earendil-works/pi-coding-agent`, declared as `peerDependencies: "*"` and
  NOT bundled; `typebox` is likewise a peer per pi's packages doc.
- **Handler return contract**: The no-op handler ALWAYS returns
  `{ systemPrompt: e.systemPrompt }` — never `undefined`. pi reverts to its
  base prompt when an extension returns `undefined` (verified in
  `dist/core/agent-session.js`), which would defeat Invariant 3; the
  always-return discipline is established here and inherited by every
  downstream epic.
