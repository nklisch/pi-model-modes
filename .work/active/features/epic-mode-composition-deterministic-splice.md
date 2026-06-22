---
id: epic-mode-composition-deterministic-splice
kind: feature
stage: done
tags: [tests]
parent: epic-mode-composition
depends_on: [epic-mode-composition-mode-resolver]
release_binding: v0.2.0
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

## Design decisions (resolved during feature-design)

Resolved under autopilot (scope `--all`). Implementation tier: OPUS. **Cross-model
advisory skipped** per policy — this is a small, well-pinned pure function
(consume the resolver's ordered ModePlan + identity + base; the SPEC fixes the
order). The codex budget is reserved for handler-wiring and the completion review.

- **`assemble.ts` is a pure function over the ModePlan.** Signature:
  `assembleSystemPrompt(identity: string, plan: ModePlan, baseSystemPrompt: string)
  : string`. It NEVER loads or re-orders fragments — it consumes
  `plan.fragments` exactly as the resolver materialized them (the anti-drift
  guarantee: signature and splice both derive from the one ordered plan).
- **Join separator = blank line (`"\n\n"`).** Parts are
  `[identity, ...fragmentContents, baseSystemPrompt]`, empties dropped, joined by
  `"\n\n"`. Fragments are multi-line markdown briefs; blank-line separation reads
  as distinct prompt sections and keeps boundaries unambiguous. (The handler's
  identity-ONLY unset path keeps its existing single-`\n` form — that path does
  not go through the splice; see the note below.)
- **Empty-part handling**: a part is included only when non-empty. `identity` may
  be `""` (no model) → omitted, so the result starts with the first fragment or
  the base. `baseSystemPrompt` is real-pi-nonempty in practice but is included
  whenever non-empty. No leading/trailing blank lines (join over the filtered
  non-empty parts).
- **Clean-base + ordered-array only**: the base content is sourced from the
  `baseSystemPrompt` parameter (the handler passes `e.systemPrompt`), never from a
  cached previous output; `plan.fragments` is a pre-ordered array iterated in
  order — no `Set` iteration, no unordered object-key enumeration, no dynamic text.
- **No mutation**: the function reads its inputs and returns a new string; it
  never mutates `plan`, `plan.fragments`, or any argument.
- **Unset path is NOT this feature's concern.** When no mode is active the handler
  keeps the existing identity-only `${identity}\n${base}` form (Invariant 3, the
  landed `noop`/`clean-base` tests). `handler-wiring` routes unset → identity-only
  and mode-active → this splice. Documented so the spacing difference between the
  two paths is intentional, not drift.
- **No child stories** — one pure function + its test.

## Architectural choice

A single pure module `src/assemble.ts` with one exported function. It depends UP
on `mode-resolver`'s `ModePlan` type only (it does NOT import `fragments.ts` —
content arrives pre-loaded in the plan, per the codex-vetted resolver contract).
No pi coupling — trivially unit-testable.

## Implementation Units

### Unit 1: `src/assemble.ts`

```ts
import type { ModePlan } from "./resolver.js";

/**
 * Splice the effective system prompt in the SPEC's fixed order:
 *
 *   [identity line]
 *   [base overlay] [agency] [quality] [scope] [modifiers]   // = plan.fragments, in order
 *   [pi's baseSystemPrompt]
 *
 * Pure: consumes `plan.fragments` exactly as `mode-resolver` materialized them
 * (no re-load, no re-order — so the assembled bytes match what `plan.signature`
 * was hashed from). Clean-base: the trailing base is sourced from the
 * `baseSystemPrompt` argument, never from any cached previous output. Ordered-
 * array only; no dynamic text. Parts are joined by a blank line; empty parts
 * (e.g. an empty identity when there is no model) are dropped so there are no
 * stray blank lines.
 *
 * @param identity         the identity line ("" when there is no model)
 * @param plan             the materialized ModePlan (its fragments are pre-ordered)
 * @param baseSystemPrompt pi's assembled `e.systemPrompt` for the turn
 */
export function assembleSystemPrompt(
  identity: string,
  plan: ModePlan,
  baseSystemPrompt: string,
): string {
  const parts: string[] = [];
  if (identity.length > 0) parts.push(identity);
  for (const fragment of plan.fragments) parts.push(fragment.content);
  if (baseSystemPrompt.length > 0) parts.push(baseSystemPrompt);
  return parts.join("\n\n");
}
```

**Acceptance criteria**:
- [ ] Order is exactly `identity`, then each `plan.fragments[i].content` in array
      order, then `baseSystemPrompt`, joined by `"\n\n"`.
- [ ] Empty `identity` is omitted (result begins with the first fragment/base, no
      leading blank line); empty `baseSystemPrompt` is omitted.
- [ ] The function does not mutate `plan`, `plan.fragments`, or any argument
      (frozen-input test passes).
- [ ] With `plan.fragments === []` and a non-empty identity, the result is
      `${identity}\n\n${baseSystemPrompt}` (degenerate — the handler uses the
      identity-only `\n` path for true unset; this just proves the splice is
      well-defined for an empty plan).
- [ ] Determinism: same inputs → byte-identical output across N calls.

## Implementation Order
1. `src/assemble.ts` (Unit 1).
2. `tests/assemble.test.ts` — build a synthetic `ModePlan` literal (no resolver
   needed — the splice only reads `plan.fragments[].content`); cover order,
   empty-identity, empty-base, no-mutation (Object.freeze the plan + fragments),
   determinism, and a full base→axes→modifiers ordering case.

## Testing
- **Order**: a plan with base+3 axes+2 modifiers → assert the exact joined string
  and the slot order via the output segments.
- **Empty identity** (no model): `assembleSystemPrompt("", plan, base)` → no
  leading blank line; starts with the first fragment.
- **Empty base**: omitted cleanly (no trailing blank line).
- **No mutation**: `Object.freeze(plan)` and freeze `plan.fragments` + each
  fragment; assert the call does not throw and returns the expected bytes.
- **Determinism**: N calls → identical bytes.
- Pure-function tests need no fragment/preset/cache setup.

## Risks
- **Spacing inconsistency between unset (`\n`) and mode-active (`\n\n`) paths**
  (LOW, intentional). Documented above; the two paths are distinct and each is
  internally cache-stable. `handler-wiring` owns the routing.

## Unit 2: roll `docs/ARCHITECTURE.md` enforcement table forward

With `assemble.ts` now real, the enforcement-table rows the identity epic
temporarily credited to `handler.ts` roll forward:
- **Clean-base handling** → `assemble.ts` (the splice sources the trailing base
  from `baseSystemPrompt`, never `lastResult`).
- **Cache stability** → `assemble.ts` + `cache.ts` (ordered-array assembly, no
  dynamic text; key covers all inputs).
Remove the "no `assemble.ts` yet" parenthetical added by handler-integration.

## Implementation notes

Landed `src/assemble.ts` (the pure `assembleSystemPrompt(identity, plan, base)`)
and `tests/assemble.test.ts` (8 tests: fixed order + blank-line join, order
preservation, empty-identity/empty-base/empty-plan handling, frozen-input purity,
determinism). Verification: `npm run typecheck` clean; `npm test` green — 12 files,
163 tests (was 155; +8).

**Deviation — Unit 2 (ARCHITECTURE enforcement-table roll-forward) DEFERRED to
`handler-wiring`.** `assemble.ts` now exists as a pure module, but the handler does
not route the MISS path through it until `handler-wiring` lands — so at this point
clean-base is STILL enforced in `handler.ts` (the identity-only path). Rolling the
table to credit `assemble.ts` now would assert a not-yet-true enforcement location,
violating rolling-foundation (docs = current truth). The roll-forward moves to
`handler-wiring`, where `assemble.ts` actually becomes the live enforcement point.

## Review record

**Verdict: Approve** — cross-model codex review (peeragent). One should-fix:
empty fragment content was kept (inconsistent with identity/base), which would
produce a stray doubled blank line for a whitespace-only fragment; fixed (drop
empty fragment content) + test added. Order/purity/determinism confirmed correct.
Suite green, typecheck clean. Advanced review → done.
