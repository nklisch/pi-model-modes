---
id: epic-identity-injection-handler-integration
kind: feature
stage: implementing
tags: [tests]
parent: epic-identity-injection
depends_on: [epic-identity-injection-identity-derivation, epic-identity-injection-cache-and-change-signal]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Handler Integration — Identity Injection + Cache Wiring

## Brief

This feature rewires `src/handler.ts` from the no-op form (`{ systemPrompt:
e.systemPrompt }`) into the identity-injecting, cache-aware form that is the
per-turn data flow's heart (ARCHITECTURE steps 2-8, minus mode fragments).
On each call it computes the cache key, consults the result cache: on a HIT
it returns `lastResult` unchanged; on a MISS it derives the identity line
(via identity-derivation), assembles `identity + e.systemPrompt` (identity
prepended as the first byte — the most-stable element, anchoring the longest
cached prefix), stores the new `lastKey`/`lastResult`, records the change
signal, and returns. The **always-return discipline** inherited from
`epic-scaffold-handler` must survive both paths: HIT and MISS both return a
present `systemPrompt`, never `undefined`, preserving the strict
`RequiredBeforeAgentStartResult` compile-time contract.

This is the integration child — it consumes the two foundation features and
produces the user-visible behavior the epic is named for (the model is told
what it is, every turn, and switching `/model` updates the line next turn
because identity is derived per turn off live `ctx.model`, never cached
against a stale snapshot). It also evolves a predecessor test: the
scaffolding-form Invariant 3 assertion in `tests/noop.test.ts` (return ===
input, byte-for-byte) can no longer hold once identity is always prepended;
that test's assertion drifts from "byte-identical" to "identity prepended,
remainder byte-identical" (test-debt evolution per the project's
test-integrity rules, not a product bug).

This feature does NOT cover: the identity derivation itself
(identity-derivation), the cache key or change signal (cache-and-change-signal),
mode fragments (later epics — no mode yet, so assembly is identity + pi base
only), or `/mode:inspect` (mode-inspect). It is the orchestrator that wires
the two foundations into the existing handler and updates the predecessor's
tests to match the new always-inject reality.

## Epic context

- Parent epic: `epic-identity-injection`
- Position in epic: **integration / consumer of both foundations.** It
  depends on identity-derivation (for the miss-path line) and
  cache-and-change-signal (for the key + hit/miss + store + record). It is
  the load-bearing user-visible child: the cache-stability test depends on
  it (tests its assembled output), and it produces the `lastResult`/identity
  that mode-inspect ultimately surfaces.

## Foundation references

- `docs/SPEC.md` — "Integration point: `before_agent_start`" (handler
  signature, return contract), "Cache key and the change signal" (the
  hit/miss branch and the never-`undefined` rule), "Identity line"
  (prepended as the first line), "The three invariants" (Invariant 1
  clean-base — splice sources from `e.systemPrompt` never from `lastResult`;
  note Invariant 3's scaffolding form evolves here since identity is now
  always injected).
- `docs/ARCHITECTURE.md` — "Per-turn data flow" (steps 2-8: compute key,
  hit→return lastResult, miss→derive identity, assemble, store, emit change
  signal, return), "Where each invariant is enforced" (clean-base in
  `assemble.ts` — splice from `e.systemPrompt`; no-op-unset in `handler.ts`),
  "Key design properties" (identity leads; the cache key is the only thing
  that decides work).
- `src/handler.ts` (current) — the no-op form being extended; the strict
  `RequiredBeforeAgentStartResult` return type and the always-return
  contract established by `epic-scaffold-handler` must be preserved.
- `tests/noop.test.ts`, `tests/clean-base.test.ts` (current) — predecessor
  tests this feature evolves (noop's byte-identity assertion; clean-base's
  no-mutation/no-cache-leak assertions carry forward unchanged in spirit).

## Inherited design decisions (from parent epic)

These are locked in the epic's `## Design decisions`; this feature inherits
them and must not re-litigate:

- **Always inject identity**: the identity line is prepended on every turn,
  even with no mode selected and even with a custom `SYSTEM.md` /
  `--system-prompt`. Identity is purely additive — prepended as the first
  line, never overriding or removing the user's content.
- **Identity format / placement**: `You are {model.name} from
  {providerDisplayName}.` as the very first byte (longest-lived cached
  prefix).
- **Always-return contract** (from `epic-scaffold-handler`): the handler
  ALWAYS returns `{ systemPrompt }`, never `undefined`, on both the cache
  hit and miss paths. The strict `RequiredBeforeAgentStartResult` return
  type stays.

## Design decisions

Resolved under autopilot delegation (scope `--all`); rationale logged per
the test-integrity and rolling-foundation rules. Implementation tier: GLM 5.2.

- **`ctx.model === undefined` handling — skip identity, still cache + return.**
  When `ctx.model` is `undefined` (defensive; production pi normally provides
  a model), the handler skips identity injection AND still caches + returns.
  The cache key uses `modelId: ""`, `modelProvider: ""` — `CacheKeyInputs`
  types all four fields as required `string`, so empty strings (not
  `undefined`) keep the key well-defined and deterministic across consecutive
  no-model turns. The assembled result is exactly `e.systemPrompt` (NO leading
  newline: `${identity}\n${base}` only when `identity` is non-empty). Rationale:
  identity is name+provider derived from a real model object — with no model
  there is nothing truthful to inject, and a placeholder would lie to the
  model. The empty-model key means the cache discipline (hit/miss, change
  signal) applies uniformly instead of special-casing one input shape.
  Adopted from the autopilot brief's recommendation; diverges from none of
  the epic's locked decisions.
- **Handler reads `ctx.model` directly** (no `'model' in ctx` guard, no
  try/catch). Runtime `undefined` is handled by `const identity = model ?
  deriveIdentityLine(model) : ""`. This means the test harness's fail-fast
  `makeContext` Proxy intentionally forces every handler-exercising test to
  supply `ctx.model` — that is the contract, not a workaround. All three
  handler tests (`noop.test.ts`, `clean-base.test.ts`, `handler.test.ts`)
  supply a model fixture via `makeContext({ model })`.
- **Promote `makeModel` to `tests/harness.ts` (SSOT).** `tests/identity.test.ts`
  already carries a local `makeModel` factory; this feature promotes an
  identical one to the harness so `noop`, `clean-base`, and `handler` tests
  share it, and switches `identity.test.ts` to import it. Small touch to a
  done feature's test file, but it prevents two-diverging-factories drift and
  is pure test-debt cleanup (no behavior change).
- **No child stories.** ~6 tightly-cohesive units (one handler + its test
  cluster + two doc files). Single implementor stride; every test exercises
  the handler. Spawning stories would add overhead without fan-out or
  dependency-visibility benefit. The feature IS the implementation unit.
- **Doc roll-forward is OWNED here** (per the epic's `## Handoff obligations`
  + the codex consult requirement). Invariant 3's literal scaffolding
  wording ("returns `e.systemPrompt` unchanged") is no longer true once
  identity always injects; rolling-foundation requires the docs describe
  current truth. SPEC + ARCHITECTURE roll forward as implement-pass units,
  not design artifacts.

## Design

### Architectural choice

Single inline handler, two-path (HIT / MISS), identity-leading splice on
miss only. The cache module already owns all stateful discipline
(`lastKey`/`lastResult`, turn accounting, change-signal ring); the handler
is a thin orchestrator that computes a key, branches, and assembles on
miss. No new module — the foundations (`identity.ts`, `cache.ts`,
`provider-names.ts`) export everything needed. This keeps the handler as
the single `before_agent_start` entry point and avoids a speculative
`assemble.ts` (ARCHITECTURE lists it, but with no mode fragments yet there
is nothing for it to assemble beyond `identity + "\n" + base`; mode
composition's epic introduces `assemble.ts` when fragments exist).

### Unit 1 (trickiest): the rewritten handler — `src/handler.ts`

**File**: `src/handler.ts` (rewrite; preserve `RequiredBeforeAgentStartResult`)

```ts
import type {
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { deriveIdentityLine } from "./identity.js";
import {
  computeCacheKey,
  getCachedResult,
  setCachedResult,
  NO_MODE_SIGNATURE,
} from "./cache.js";
import type { CacheKeyInputs } from "./cache.js";

export type RequiredBeforeAgentStartResult = BeforeAgentStartEventResult & {
  systemPrompt: string;
};

/**
 * `before_agent_start` handler — identity-injecting, cache-aware form.
 *
 * Per turn:
 *   1. Build cache-key inputs from `ctx.model` (empty id/provider when the
 *      model is undefined) + `NO_MODE_SIGNATURE` (no mode yet) +
 *      `e.systemPrompt` (pi's assembled base).
 *   2. `getCachedResult(key)` — advances the turn counter; returns the cached
 *      result on HIT, `undefined` on MISS.
 *   3. HIT  → return `{ systemPrompt: cached }` (identity was baked in at the
 *      prior miss; no re-assembly, no re-derive).
 *   4. MISS → derive identity from `ctx.model` (empty string when undefined),
 *      assemble `identity + "\n" + e.systemPrompt` when identity is non-empty
 *      (else `e.systemPrompt` unchanged — no leading newline),
 *      `setCachedResult(key, result, inputs)`, return.
 *
 * Contracts preserved from `epic-scaffold-handler`:
 *   - ALWAYS returns `{ systemPrompt: <string> }`, never `undefined`, on BOTH
 *     paths (strict `RequiredBeforeAgentStartResult` makes omission a
 *     compile-time error).
 *   - Never mutates `e.systemPrompt` or any field of `e`.
 *   - Clean-base: the MISS splice sources from `e.systemPrompt`, never from
 *     `lastResult`. The HIT path returns `lastResult` wholesale without
 *     splicing into it — so identity is never stacked across turns.
 */
export function handleBeforeAgentStart(
  e: BeforeAgentStartEvent,
  ctx: ExtensionContext,
): RequiredBeforeAgentStartResult {
  const model = ctx.model; // Model<any> | undefined
  const modelId = model?.id ?? "";
  const modelProvider = model?.provider ?? "";

  const inputs: CacheKeyInputs = {
    modelId,
    modelProvider,
    modeSignature: NO_MODE_SIGNATURE,
    baseSystemPrompt: e.systemPrompt,
  };
  const key = computeCacheKey(inputs);

  // HIT — return the previously-assembled result unchanged.
  const cached = getCachedResult(key);
  if (cached !== undefined) {
    return { systemPrompt: cached };
  }

  // MISS — derive identity, assemble (identity leads), store, return.
  const identity = model ? deriveIdentityLine(model) : "";
  const result = identity ? `${identity}\n${e.systemPrompt}` : e.systemPrompt;
  setCachedResult(key, result, inputs);
  return { systemPrompt: result };
}
```

**Implementation notes**:
- `_ctx` → `ctx` (now read; drop the underscore).
- No `Model<any>` import needed — `ctx.model`'s type flows from
  `ExtensionContext`; the `model ? ... : ""` ternary narrows for
  `deriveIdentityLine`.
- `inputs` is built once and passed to both `computeCacheKey` and
  `setCachedResult` so the change-signal classification sees the exact same
  components the key was hashed from (Fail Fast: `setCachedResult` throws if
  `key === lastKey`, which can't happen here because we only reach `set`
  after a MISS).
- HIT path returns `cached` (a `string`, narrowed by `!== undefined`) —
  satisfies `RequiredBeforeAgentStartResult` without a cast.

### Unit 2: evolve `tests/noop.test.ts` (4 codex assertions)

**File**: `tests/noop.test.ts` (rewrite the body; keep the Invariant-3 framing)

The scaffolding-form assertion (`result.systemPrompt === input` byte-for-byte)
is test debt now: identity is always prepended. Evolve to:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { handleBeforeAgentStart } from "../src/handler.js";
import { deriveIdentityLine } from "../src/identity.js";
import { resetCacheForTesting } from "../src/cache.js";
import { makeContext, makeEvent, makeModel } from "./harness.js";

describe("handleBeforeAgentStart — Invariant 3 evolved (identity-prepended, remainder byte-identical, never undefined)", () => {
  const model = makeModel({ name: "GLM-4.6", provider: "zai" });
  const identity = deriveIdentityLine(model);

  beforeEach(() => resetCacheForTesting()); // module-scope cache state isolates per case

  const fixtures: Record<string, string> = {
    typical: "You are an expert coding assistant...\n\nAvailable tools:\n- read",
    "project-context": "You are an expert...\n<project_context>...</project_context>",
    whitespace: "   \n\t  ",
  };

  const countIdentityLines = (s: string) =>
    s.split("\n").filter((l) => l === identity).length;

  for (const [name, input] of Object.entries(fixtures)) {
    it(`prepends identity, remainder byte-identical (${name})`, () => {
      const result = handleBeforeAgentStart(makeEvent(input), makeContext({ model }));

      // (d) always a present systemPrompt (never undefined).
      expect(typeof result.systemPrompt).toBe("string");
      expect(result.systemPrompt.length).toBeGreaterThan(0);

      // (a) identity line is the FIRST line and matches deriveIdentityLine(model).
      expect(result.systemPrompt.split("\n")[0]).toBe(identity);

      // (b) the remainder after the identity line is byte-identical to the input.
      expect(result.systemPrompt).toBe(`${identity}\n${input}`);
    });
  }

  it("does not duplicate identity across repeated same-input calls (cache does not stack)", () => {
    const input = "typical prompt body";
    const r1 = handleBeforeAgentStart(makeEvent(input), makeContext({ model }));
    const r2 = handleBeforeAgentStart(makeEvent(input), makeContext({ model }));
    const r3 = handleBeforeAgentStart(makeEvent(input), makeContext({ model }));

    // (c) exactly ONE identity line across repeated calls (r1 MISS, r2/r3 HIT).
    expect(countIdentityLines(r1.systemPrompt)).toBe(1);
    expect(countIdentityLines(r2.systemPrompt)).toBe(1);
    expect(countIdentityLines(r3.systemPrompt)).toBe(1);

    // HIT path returns the prior miss's bytes (no re-assembly, no stacking).
    expect(r2.systemPrompt).toBe(r1.systemPrompt);
    expect(r3.systemPrompt).toBe(r1.systemPrompt);
  });
});
```

**Notes**: drop the `empty: ""` fixture (degenerate — identity prepended to an
empty base is not a meaningful Invariant-3 case; real pi prompts are never
empty per the handler comment). `result.message` still asserted `undefined`.

### Unit 3: evolve `tests/clean-base.test.ts` (GAP FLAGGED)

**File**: `tests/clean-base.test.ts` (rewrite assertions; keep the
Invariant-1 framing and `A→B→C→A` shape)

> **FLAG — undocumented in the brief's unit list.** The feature brief lists 5
> units and does NOT name `clean-base.test.ts`. But its current assertions
> (`result.systemPrompt === e.systemPrompt`, `=== "PROMPT_A"`, etc.) break the
> instant identity always-prepends, AND it calls `makeContext()` with no model
> (the handler now reads `ctx.model` → fail-fast Proxy throws). Without
> evolving this file the build breaks on landing. Per test-integrity rules
> this is test-debt evolution, not a product bug — same class as the noop
> evolution. The brief's "clean-base's no-mutation/no-cache-leak assertions
> carry forward unchanged in spirit" covers this: the *spirit* (no mutation,
> no leak) survives; the literal byte-equality assertions evolve.

Evolve to:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { handleBeforeAgentStart } from "../src/handler.js";
import { deriveIdentityLine } from "../src/identity.js";
import { resetCacheForTesting } from "../src/cache.js";
import { makeContext, makeEvent, makeModel } from "./harness.js";

describe("handleBeforeAgentStart — Invariant 1 (no mutation + no cached-output leak, identity-prepended)", () => {
  const model = makeModel({ name: "GLM-4.6", provider: "zai" });
  const identity = deriveIdentityLine(model);
  const assemble = (base: string) => `${identity}\n${base}`;

  beforeEach(() => resetCacheForTesting());

  it("does not mutate the input event (Object.freeze catches any mutation as a thrown TypeError)", () => {
    const e = makeEvent("line1\nline2\n<project_context>...</project_context>");
    Object.freeze(e);
    expect(() => handleBeforeAgentStart(e, makeContext({ model }))).not.toThrow();
    // Identity-prepended (no longer byte-identical to input); freeze proves no mutation.
    expect(handleBeforeAgentStart(e, makeContext({ model })).systemPrompt).toBe(
      assemble(e.systemPrompt),
    );
  });

  it("does not leak a previous output across calls (A→B→C→A sequence)", () => {
    const a1 = handleBeforeAgentStart(makeEvent("PROMPT_A"), makeContext({ model }));
    const b  = handleBeforeAgentStart(makeEvent("PROMPT_B"), makeContext({ model }));
    const c  = handleBeforeAgentStart(makeEvent("PROMPT_C"), makeContext({ model }));
    const a2 = handleBeforeAgentStart(makeEvent("PROMPT_A"), makeContext({ model }));

    // Each return reflects THAT call's input (identity + base), not a leaked
    // prior output. a2 is a MISS (lastKey was C), so it re-assembles from A.
    expect(a1.systemPrompt).toBe(assemble("PROMPT_A"));
    expect(b.systemPrompt).toBe(assemble("PROMPT_B"));
    expect(c.systemPrompt).toBe(assemble("PROMPT_C"));
    expect(a2.systemPrompt).toBe(assemble("PROMPT_A")); // NOT leaked from a1 or c
  });
});
```

### Unit 4: new `tests/handler.test.ts` — cache-path coverage

**File**: `tests/handler.test.ts` (new)

The always-return regression catch: a MISS path returning `undefined` would
silently drop identity (the worst failure mode). Cover both paths explicitly.

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { handleBeforeAgentStart } from "../src/handler.js";
import { deriveIdentityLine } from "../src/identity.js";
import { resetCacheForTesting } from "../src/cache.js";
import { makeContext, makeEvent, makeModel } from "./harness.js";

describe("handleBeforeAgentStart — cache-path coverage (always-return on HIT and MISS)", () => {
  const model = makeModel({ name: "GLM-4.6", provider: "zai" });

  beforeEach(() => resetCacheForTesting());

  it("first call (MISS) returns a present string", () => {
    const r = handleBeforeAgentStart(makeEvent("base prompt"), makeContext({ model }));
    expect(typeof r.systemPrompt).toBe("string");
    expect(r.systemPrompt.length).toBeGreaterThan(0);
  });

  it("second identical call (HIT) returns the cached present string", () => {
    const r1 = handleBeforeAgentStart(makeEvent("base prompt"), makeContext({ model }));
    const r2 = handleBeforeAgentStart(makeEvent("base prompt"), makeContext({ model }));
    expect(typeof r2.systemPrompt).toBe("string");
    expect(r2.systemPrompt).toBe(r1.systemPrompt); // HIT returns prior miss's bytes
  });

  it("changed input (MISS) still returns a present string", () => {
    handleBeforeAgentStart(makeEvent("base prompt A"), makeContext({ model }));
    handleBeforeAgentStart(makeEvent("base prompt B"), makeContext({ model })); // base change → MISS
    const r = handleBeforeAgentStart(makeEvent("base prompt A"), makeContext({ model })); // back to A → MISS
    expect(typeof r.systemPrompt).toBe("string");
    expect(r.systemPrompt.length).toBeGreaterThan(0);
  });

  it("switching model re-derives identity on the next MISS (per-turn live derivation)", () => {
    const modelA = makeModel({ name: "GLM-4.6", provider: "zai" });
    const modelB = makeModel({ name: "Claude Sonnet 4", provider: "anthropic" });
    const rA = handleBeforeAgentStart(makeEvent("base"), makeContext({ model: modelA }));
    const rB = handleBeforeAgentStart(makeEvent("base"), makeContext({ model: modelB }));
    expect(rA.systemPrompt.split("\n")[0]).toBe(deriveIdentityLine(modelA));
    expect(rB.systemPrompt.split("\n")[0]).toBe(deriveIdentityLine(modelB));
  });
});
```

The 4th test proves the epic's headline behavior: identity is derived per
turn off live `ctx.model` (never cached against a stale snapshot) — switching
`/model` updates the line on the next MISS.

### Unit 5: roll `docs/SPEC.md` forward

**File**: `docs/SPEC.md` (edit two sections)

- **§"The three invariants" → Invariant 3 ("No-op when unset")**: rewrite from
  _"the handler returns `{ systemPrompt: e.systemPrompt }` — pi's prompt
  unchanged"_ to _"the handler prepends the identity line and injects NO mode
  fragments. Baseline pi behavior is preserved for mode (no fragments);
  identity is purely additive and applies even with a custom `SYSTEM.md` /
  `--system-prompt`."_ Evolve the test line: _"with mode unset, the handler's
  return has the identity line as its first byte and no mode fragments; the
  remainder is byte-identical to pi's assembled base."_
- **§"Identity line"**: add an explicit sentence that identity is prepended on
  EVERY turn (including mode-unset and custom-prompt turns), reinforcing the
  additive/never-overriding semantics already implied.
- **§"Open questions" → ctx.model freshness**: the per-turn live derivation is
  now implemented and proven by `handler.test.ts`'s model-switch case — update
  the note from "Resolved with a test during implementation" to "Resolved —
  identity is derived fresh each MISS off live `ctx.model`; the model-switch
  test in `tests/handler.test.ts` proves the line updates on the next MISS."

### Unit 6: roll `docs/ARCHITECTURE.md` forward

**File**: `docs/ARCHITECTURE.md` (edit three spots)

- **§"Where each invariant is enforced" table — "No-op when unset" row**:
  change the `How` cell from _"`mode === unset` short-circuits to
  `{ systemPrompt: e.systemPrompt }`"_ to _"identity always prepended;
  mode-unset injects NO mode fragments (identity still injects). `handler.ts`"_.
  Clean-base row unchanged (splice sources from `e.systemPrompt`).
- **§"Per-turn data flow"**: clarify that with no mode selected, the MISS
  splice (step 6) emits only `[identity line] + e.systemPrompt` (no base
  overlay, no axis/modifier fragments); step 4 (derive identity) runs on
  every MISS regardless of mode.
- **§"Components" diagram → `tests/` list**: drift fix — the diagram lists
  `noop-unset.test.ts` but the real file is `noop.test.ts`. Align the list
  with the actual files on disk: `cache.test.ts`, `cache-stability.test.ts`
  (downstream, not yet present), `clean-base.test.ts`, `handler.test.ts`,
  `identity.test.ts`, `noop.test.ts`, `registration.test.ts`.

## Acceptance criteria

- [ ] Handler ALWAYS returns `{ systemPrompt: <string> }` on both the HIT and
  MISS paths — never `undefined`, never an omitted field (strict
  `RequiredBeforeAgentStartResult` return type preserved and satisfied).
- [ ] Identity line is prepended as the first byte on every MISS, matching
  `deriveIdentityLine(ctx.model)`; the remainder is byte-identical to
  `e.systemPrompt`.
- [ ] HIT path returns the prior MISS's assembled bytes unchanged (no
  re-derive, no re-assemble, no identity stacking).
- [ ] MISS path assembles fresh from `e.systemPrompt` (clean-base: never
  splices from `lastResult`).
- [ ] `ctx.model === undefined` skips identity injection but still caches +
  returns a present string (key uses empty model id/provider; result equals
  `e.systemPrompt` with no leading newline).
- [ ] Switching `ctx.model` between turns changes the cache key → MISS → the
  identity line reflects the new model on the next MISS.
- [ ] `tests/noop.test.ts` passes with the 4 evolved assertions (identity
  first line; remainder byte-identical; exactly one identity line across
  repeats; always-present `systemPrompt`).
- [ ] `tests/clean-base.test.ts` passes in evolved form (no mutation; no leak;
  identity-prepended assertions).
- [ ] `tests/handler.test.ts` passes: first call MISS present; second
  identical call HIT present + byte-equal to first; changed-input MISS still
  present; model-switch re-derives identity.
- [ ] `npm run typecheck` clean (the strict return type must still compile).
- [ ] `npm test` green across the whole suite.
- [ ] `docs/SPEC.md` Invariant 3 + Identity-line + open-question sections
  rolled forward to describe identity-always-prepended current truth.
- [ ] `docs/ARCHITECTURE.md` enforcement table + per-turn flow + components
  test-list rolled forward; `noop-unset.test.ts` → `noop.test.ts` drift fixed.
- [ ] `extensions/index.ts` registration unchanged (still exactly one
  `pi.on("before_agent_start", handleBeforeAgentStart)`).

## Implementation units

1. `tests/harness.ts` — promote `makeModel` factory (SSOT); switch
   `tests/identity.test.ts` to import it (drop the local copy).
2. `src/handler.ts` — rewrite per Unit 1 (cache-aware identity injection;
   preserve `RequiredBeforeAgentStartResult`).
3. `tests/noop.test.ts` — evolve per Unit 2 (4 codex assertions).
4. `tests/clean-base.test.ts` — evolve per Unit 3 (GAP from brief; required
   or build breaks).
5. `tests/handler.test.ts` — new per Unit 4 (cache-path always-return +
   model-switch coverage).
6. `docs/SPEC.md` — roll forward per Unit 5.
7. `docs/ARCHITECTURE.md` — roll forward per Unit 6.

## Implementation order

1. **Unit 1 (harness `makeModel`)** first — every test file depends on it.
2. **Unit 2 (handler rewrite)** — the production change; typecheck once it lands.
3. **Units 3, 4, 5 (test files) together** — they all exercise the handler;
   write them in one pass and run the full suite. Order among them is free.
4. **Units 6, 7 (docs)** last — rolling-forward describes the now-shipped
   truth; doing it after the code is green keeps the docs honest.

A single implementor stride (GLM 5.2) can land all seven. The
implement-orchestrator is not needed (no fan-out, no parallel agents).

## Testing

- **Per-unit**: covered inline above (exact `it(...)` blocks with assertions).
- **Integration seams**: the handler is THE integration point — it consumes
  `identity.ts` + `cache.ts` together for the first time.
  `tests/handler.test.ts` is the seam test (proves the two foundations compose
  correctly behind the handler).
- **Module-state isolation**: every test file uses
  `beforeEach(() => resetCacheForTesting())` because the cache is
  module-scope stateful; without reset, turn-counter and `lastKey` leak
  across cases within one vitest process.
- **Downstream**: `epic-identity-injection-cache-stability-test` (depends on
  this feature) adds the load-bearing Invariant-2 byte-stability test; it is
  out of scope here.

## Risks

- **`clean-base.test.ts` evolution is load-bearing and undocumented in the
  brief's unit list.** Mitigated by Unit 3 + the FLAG above; the
  implementor MUST touch this file or `npm test` breaks the moment the
  handler lands. This is the highest-likelihood miss.
- **`makeModel` promotion touches a done feature's test (`identity.test.ts`).**
  Low risk (factory is identical, just relocated), but if the implementor
  prefers minimum blast radius they may leave the local copy in
  `identity.test.ts` and add a separate `makeModel` to the harness — accept
  the duplication. Promoting + switching is the cleaner SSOT move.
- **Empty-string `e.systemPrompt` with a model present** yields
  `identity + "\n"` (a trailing identity over empty base). Real pi prompts
  are never empty (per the existing handler comment), so this is a
  theoretical edge — documented, not specially handled.
- **No mode-composition yet.** The handler uses `NO_MODE_SIGNATURE` ("")
  directly. When `epic-mode-composition` lands it will replace that literal
  with the real composed signature; the handler's shape does not need to
  change beyond that one argument. Late-binding honored.

## Divergence from landed module APIs vs. epic/SPEC prose

None blocking. The landed `cache.ts` / `identity.ts` / `provider-names.ts`
exports match what the epic and SPEC describe, with two minor clarifications
the design bakes in:
- `CacheKeyInputs.modelId` / `modelProvider` are typed **required `string`**
  (not `string | undefined`), so the undefined-model path passes `""` rather
  than `undefined`. The SPEC's prose ("`hash(model.id, model.provider, ...)`")
  implies non-optional; the implementation makes it explicit.
- `getCachedResult` increments the turn counter at the START of every call —
  so the handler must call it exactly once per turn (it does; no extra
  consulting). The change-signal `turn` field therefore aligns with pi turns.
These are consistent with the foundations' Fail Fast / SSOT design; no
rework of the landed modules is needed.

## Codex consult requirements (folded in from decomposition review)

- **Roll the foundation docs forward** (OWNED HERE, not elsewhere). The
  locked decision "always inject identity" means Invariant 3 is no longer
  literally "returns `e.systemPrompt` unchanged" — it's "returns `e.systemPrompt`
  with identity prepended, and NO mode fragments when unset." `docs/SPEC.md`
  ("The three invariants" → Invariant 3, and "Identity line") and
  `docs/ARCHITECTURE.md` ("Where each invariant is enforced" + per-turn flow)
  must be updated as part of this feature's implement pass (rolling-foundation:
  docs describe current truth). Flag this in the feature body so the
  implementor doesn't miss it.
- **Evolved `noop.test.ts` assertions** (be specific): (a) the identity line
  is the FIRST line and matches `deriveIdentityLine(model)`; (b) the
  REMAINDER after the identity line is byte-identical to the input
  `e.systemPrompt`; (c) across repeated calls with the same input, there is
  exactly ONE identity line (no duplication from caching); (d) the result
  always has a present `systemPrompt` (never undefined).
- **Always-return through both cache paths** — explicit test: first call
  (MISS) returns a present string; second identical call (HIT) returns the
  cached present string; a call with changed input (MISS) still returns a
  present string. A regression where the MISS path returns `undefined` would
  silently drop identity+mode — this is the worst failure mode and must be
  caught.
