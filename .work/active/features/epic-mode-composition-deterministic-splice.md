---
id: epic-mode-composition-deterministic-splice
kind: feature
stage: drafting
tags: [tests]
parent: epic-mode-composition
depends_on: [epic-mode-composition-mode-resolver]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Deterministic Splice — assemble identity + plan + e.systemPrompt in fixed order

## Brief

This feature delivers `src/assemble.ts`: given the identity line, a materialized
ModePlan (from `mode-resolver`), and pi's `e.systemPrompt`, it produces the spliced
prompt in the SPEC's fixed, deterministic order:

```
[identity line]
[base voice overlay]   // only when base != "pi"
[agency fragment]
[quality fragment]
[scope fragment]
[modifier fragments]   // preset-declared order
... e.systemPrompt ...
```

The splice **consumes the plan's already-loaded, already-ordered fragments** — it
never re-loads from disk and never re-orders, so its output is byte-identical to
what the plan's signature was hashed from (the anti-drift guarantee from the epic's
codex advisory). Assembly is **ordered-array only**: no `Set` iteration, no
unordered object-key enumeration, no dynamic text — the Invariant-2 forbidden list.
Clean-base holds: the splice sources base content from the plan and trailing
content from `e.systemPrompt`, never from any cached previous output.

This feature does NOT compute the signature or load fragments (that is
`mode-resolver` / `fragment-loader`, surfaced via the plan), and does NOT wire the
handler (that is `handler-wiring`).

## Epic context

- Parent epic: `epic-mode-composition`
- Position in epic: **the assembler; consumes the resolver's ModePlan.** The
  introduction of `assemble.ts` (which ARCHITECTURE's enforcement table already
  anticipates — the identity epic deferred it) lands here.

## Foundation references

- `docs/SPEC.md` — "Mode composition" (the exact fixed splice order), "The three
  invariants" (1: clean-base splice from `e.systemPrompt`; 2: no dynamic text /
  ordered arrays only).
- `docs/ARCHITECTURE.md` — "Per-turn data flow" (step 6 splice), "Where each
  invariant is enforced" (clean-base + cache-stability move to `assemble.ts` here —
  the rows the identity epic temporarily pointed at `handler.ts` roll forward).

## Inherited / epic design decisions (do not re-litigate)

- **Fixed splice order** per SPEC; **ordered-array only** (no `Set`/unordered keys).
- **Consume the ModePlan; never re-load or re-order** (anti-drift, from the epic's
  codex advisory).
- **`base: "pi"`** emits no base overlay line.
- **Roll the ARCHITECTURE enforcement table forward**: with `assemble.ts` now real,
  the clean-base + cache-stability rows that the identity epic temporarily credited
  to `handler.ts` move to `assemble.ts` (+`cache.ts`). Rolling-foundation.
