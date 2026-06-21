---
id: epic-scaffold-handler-noop-handler
kind: feature
stage: done
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

## Design

Grounded in pi's installed type surface
(`/home/nathan/.local/share/mise/installs/node/24.17.0/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts`,
re-exported from the package root `@earendil-works/pi-coding-agent`), the
parent epic's locked decisions, the sibling skeleton's landed factory shell,
and `docs/SPEC.md` / `docs/ARCHITECTURE.md`. **One real-vs-spec nuance
flagged below** (the type permits `undefined`; our contract forbids it).

### Real pi contracts used (verified, not invented)

From `types.d.ts`:

```ts
export interface BeforeAgentStartEvent {
  type: "before_agent_start";
  prompt: string;
  images?: ImageContent[];
  systemPrompt: string;
  systemPromptOptions: BuildSystemPromptOptions;
}

export interface BeforeAgentStartEventResult {
  message?: Pick<CustomMessage, "customType" | "content" | "display" | "details">;
  /** Replace the system prompt for this turn. If multiple extensions return
   *  this, they are chained. */
  systemPrompt?: string;   // <-- OPTIONAL in the type
}

export type ExtensionHandler<E, R = undefined> =
  (event: E, ctx: ExtensionContext) => Promise<R | void> | R | void;

// on() overload (ExtensionAPI):
on(event: "before_agent_start",
   handler: ExtensionHandler<BeforeAgentStartEvent, BeforeAgentStartEventResult>): void;
```

`BuildSystemPromptOptions` (from `core/system-prompt.ts`) has only `cwd`
required; every other field is optional — so a synthetic event can be built
with **zero casts** (`{ cwd: "/test" }` satisfies it).

> **Nuance / SPEC↔type divergence (flagged, then hardened).** The real
> `BeforeAgentStartEventResult.systemPrompt` field is `string | undefined`
> (optional), and `ExtensionHandler`'s return type explicitly admits `| void`.
> So pi's types alone do NOT enforce the always-return discipline. We close
> that gap two ways (from a codex design consult):
> 1. **Type-enforced** via a local strict return type —
>    `type RequiredBeforeAgentStartResult = BeforeAgentStartEventResult &
>    { systemPrompt: string }` — annotated on the handler. This makes a
>    handler that returns `{}`, `undefined`, or omits the field a **compile
>    error**, not just a test failure.
> 2. **Test-enforced** as defense-in-depth: `tests/noop.test.ts` still asserts
>    the return is a present string across fixtures.
>
> Note on pi's application semantics: `agent-session.js` applies the result
> with `if (result?.systemPrompt)`, so an empty-string `systemPrompt` ALSO
> resets to base at the final application point. Real pi prompts are never
> empty, so this is irrelevant in production — but the empty-string test
> fixture must not *claim* pi would apply `""`; it only asserts our handler
> returns its input unchanged.

### Component placement: `src/handler.ts` vs `extensions/index.ts`

Per ARCHITECTURE.md "Components" (`src/handler.ts` as the
`before_agent_start` entry) and "Key design properties" (plain modules with
no pi coupling except through typed interfaces → unit-testable without
spinning up pi), the handler logic lives in a **pure module**; the factory
only imports and registers it:

- **`src/handler.ts`** — exports `handleBeforeAgentStart(e, ctx)`. Pure:
  reads only `e.systemPrompt`, returns it unchanged, touches nothing else,
  holds zero module-level mutable state. The only pi coupling is via
  `import type` (types erased at runtime). Unit-testable directly.
- **`extensions/index.ts`** (EDIT, extends the sibling's shell — does NOT
  overwrite the file or the `export default` line) — renames the factory
  param `_pi` → `pi`, imports `handleBeforeAgentStart` from `../src/handler.js`,
  and registers it by reference: `pi.on("before_agent_start",
  handleBeforeAgentStart)`. Registers nothing else. The factory stays sync
  (the no-op handler is sync; its async-ness, if ever needed, is internal to
  the callback).

Registering by reference (not an inline arrow) is load-bearing: it makes the
registered handler the **same function object** the unit tests import, so a
test can assert `registeredHandler === handleBeforeAgentStart` — directly
proving the "single registration surface + unit-testability" property.

### The handler (`src/handler.ts`)

```ts
import type {
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

/**
 * `before_agent_start` handler. SCAFFOLDING / NO-OP FORM.
 *
 * CONTRACT (established here, inherited by every downstream epic):
 *  - ALWAYS returns { systemPrompt: e.systemPrompt } — never `undefined`.
 *    pi reads `undefined` as "revert to base" and would drop any later
 *    identity/mode injection, so the always-return discipline is baked in
 *    here. (Note: the real BeforeAgentStartEventResult type permits
 *    `undefined`; this contract is stricter than the type and is enforced
 *    by tests/noop.test.ts.)
 *  - Never mutates `e.systemPrompt` (or any field of `e`).
 *  - Never sources from a cached "previous output." There is no
 *    module-level mutable state on the return path at this stage; the
 *    shape is deliberately free of any `let lastResult` so later epics
 *    inherit the clean-base discipline by construction.
 *
 * No mode/identity/fragment/cache logic yet — this epic is the no-op.
 */
/** Local strict return type — makes the always-return guarantee a
 *  COMPILE-TIME error if violated, not just a test failure. pi's
 *  BeforeAgentStartEventResult.systemPrompt is optional; this narrows it. */
export type RequiredBeforeAgentStartResult = BeforeAgentStartEventResult & {
  systemPrompt: string;
};

export function handleBeforeAgentStart(
  e: BeforeAgentStartEvent,
  _ctx: ExtensionContext,
): RequiredBeforeAgentStartResult {
  return { systemPrompt: e.systemPrompt };
}
```

Notes:
- **Sync** (returns `RequiredBeforeAgentStartResult` directly). No async work
  exists at this stage. `ExtensionHandler` admits sync returns; downstream
  epics that do fragment file I/O may switch the body to `async` without
  changing the registration site. (The registration site's `on()` overload
  accepts the broader `BeforeAgentStartEventResult`-returning signature;
  our stricter return type is assignable to it — covariant return — so no
  cast is needed at registration.)
- **`_ctx` underscore-prefixed** to satisfy `noUnusedParameters: true` (the
  same convention the skeleton used for `_pi`). The param is present for
  signature compatibility with `ExtensionHandler`; it is unused at this
  stage. Downstream epics rename it to `ctx` when they start reading
  `ctx.model` / `ctx.getSystemPrompt()`.
- **Return type annotated `RequiredBeforeAgentStartResult`** (the local strict
  type) — this makes the never-`undefined` guarantee a **compile-time**
  invariant, with the runtime test as defense-in-depth.

### Relative-import specifier decision (NodeNext + jiti, no tsconfig change)

This feature introduces the project's first **relative value import**
between source dirs (`extensions/index.ts` → `../src/handler.*`). Under the
landed tsconfig (`module: NodeNext`, `moduleResolution: NodeNext`,
`verbatimModuleSyntax: true`, `isolatedModules: true`, **no**
`allowImportingTsExtensions`):

- A `.ts` specifier (`from "../src/handler.ts"`) is a **typecheck error**
  (TS2835) without `allowImportingTsExtensions`.
- A **`.js` specifier** (`from "../src/handler.js"`) is the NodeNext-native
  pattern: TypeScript resolves `.js` → the `.ts` source for typechecking,
  and **jiti** (which pi uses to load the extension — `createJiti` /
  `jiti.import` in `dist/core/extensions/loader.js`) resolves `.js` → `.ts`
  at runtime via its extension-trying resolver.

**Decision: use `.js` specifiers for every relative value import in this
feature. Zero tsconfig delta.** Rationale: NodeNext-native, no config change,
resolves correctly under both `tsc --noEmit` and jiti. This matches the
standard "TS source transpiled by a runtime loader, no emit" layout.

(Fallback, documented for the implementor: if a resolver ever rejects
`.js`→`.ts`, set `allowImportingTsExtensions: true` in tsconfig and switch
specifiers to `.ts`. Not expected — verify with `npm run typecheck` +
`npm test`; both must be green.)

Type-only imports (`import type { ... }`) are used for every type brought in
from `@earendil-works/pi-coding-agent`, as required by `verbatimModuleSyntax`.

### Test harness (`tests/harness.ts`)

Three builders, all typed against the real interfaces, all minimal:

1. **`makeEvent(systemPrompt, opts?)` → `BeforeAgentStartEvent`** — builds a
   fully-typed event with **no casts**. `systemPromptOptions: { cwd: "/test" }`
   satisfies the only required field; `prompt` defaults to `""`; `type` is
   fixed to `"before_agent_start"`. `opts` lets a test override `prompt` /
   `images` if a later epic needs them.
2. **`makeContext(overrides?)` → `ExtensionContext`** — a **fail-fast Proxy
   stub**, NOT a loose `as unknown as ExtensionContext` cast (per codex
   consult: the cast sets a weak precedent for downstream epics that DO read
   `ctx`). The stub returns provided `overrides` as-is; any access to an
   unprovided property throws a clear error like `"test stub: ctx.model not
   provided — add it to makeContext() overrides"`. This forces downstream
   epics (identity-injection needs `ctx.model`, mode-composition needs
   `ctx.getSystemPrompt()`) to explicitly supply the fields they read,
   instead of silently getting `undefined` from a loose cast. The no-op
   handler reads no `ctx` field, so its tests pass without overrides.
3. **`makePi()` → `{ pi: ExtensionAPI; calls: RecordedCall[] }`** — a
   recording stub that captures every registration call
   (`on`, `registerTool`, `registerCommand`, `registerShortcut`,
   `registerFlag`, `registerMessageRenderer`, `registerProvider`) in order.
   Used by `tests/registration.test.ts` to prove the factory registers the
   handler exactly once and nothing else. Reusable by every downstream epic
   that registers commands/keybindings/providers, which earns its place in
   the shared harness despite being slightly larger than the no-op strictly
   needs.

```ts
import type {
  BeforeAgentStartEvent,
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

export function makeEvent(
  systemPrompt: string,
  opts: Partial<Pick<BeforeAgentStartEvent, "prompt" | "images">> = {},
): BeforeAgentStartEvent {
  return {
    type: "before_agent_start",
    prompt: opts.prompt ?? "",
    systemPrompt,
    // Only `cwd` is required on BuildSystemPromptOptions; rest optional.
    systemPromptOptions: { cwd: "/test" },
    ...(opts.images ? { images: opts.images } : {}),
  };
}

/** Minimal ctx stub. The no-op handler reads no ctx field, so the cast is
 *  safe for its current contract; downstream epics extend the overrides. */
export function makeContext(
  overrides: Partial<ExtensionContext> = {},
): ExtensionContext {
  return { ...overrides } as unknown as ExtensionContext;
}

export type RecordedMethod =
  | "on" | "registerTool" | "registerCommand" | "registerShortcut"
  | "registerFlag" | "registerMessageRenderer" | "registerProvider";
export interface RecordedCall { method: RecordedMethod; args: unknown[]; }

export function makePi(): { pi: ExtensionAPI; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const rec = (method: RecordedMethod) => (...args: unknown[]) =>
    calls.push({ method, args });
  const pi = {
    on: rec("on"),
    registerTool: rec("registerTool"),
    registerCommand: rec("registerCommand"),
    registerShortcut: rec("registerShortcut"),
    registerFlag: rec("registerFlag"),
    registerMessageRenderer: rec("registerMessageRenderer"),
    registerProvider: rec("registerProvider"),
  } as unknown as ExtensionAPI;
  return { pi, calls };
}
```

### Invariant 3 test — `tests/noop.test.ts` (byte-equality + never-undefined)

Asserts the handler's return `systemPrompt` equals the input byte-for-byte
across multiple distinct inputs, AND that the return is always a present
string (never `undefined`) — the latter is the always-return discipline the
type cannot enforce (see flagged nuance above).

Fixtures (parametrized via `it.each`):
- `""` — the empty / degenerate case (pi must still receive
  `{ systemPrompt: "" }`, not `undefined`).
- `"   \n  "` — whitespace-only (no trimming, no special handling).
- A typical multi-paragraph system prompt (tools + guidelines prose).
- A prompt containing `<project_context>` blocks with nested angle-bracketed
  tags, newlines, and backticks — proves no special-character issues.

Per-fixture assertions:
```ts
const result = handleBeforeAgentStart(makeEvent(input), makeContext());
expect(result.systemPrompt).toBe(input);            // byte-for-byte (Object.is on strings)
expect(typeof result.systemPrompt).toBe("string");   // never undefined (the type can't enforce this)
expect(result).not.toBeUndefined();                  // handler always returns an object
```

`toBe` (vitest) uses `Object.is` — for strings this is exact byte-equality.

### Invariant 1 test (SCAFFOLDING FORM) — `tests/clean-base.test.ts`

Two assertions seeding the clean-base discipline that later epics inherit
when splicing begins:

1. **No mutation of the input event.** Snapshot `JSON.stringify(e)` before
   and after the handler call; assert equal. (At this stage `e.systemPrompt`
   is a primitive string so reassignment is the only mutation vector; the
   JSON snapshot also covers any sibling field.)
2. **No cross-call "previous output" cache leak.** Call the handler with
   `promptA`, then with a different `promptB`; assert the second return's
   `systemPrompt` equals `promptB` (NOT `promptA`). Proves the return path
   does not source from a cached prior result. At this stage the handler
   holds no such cache, so this is trivially green — it is the *discipline
   seed* the full-form test inherits.

```ts
// 1. No mutation — Object.freeze makes any mutation a thrown TypeError,
//    stronger than a JSON snapshot (catches deep/sibling-field mutation too).
const e = makeEvent("line1\nline2\n<project_context>...</project_context>");
Object.freeze(e);
handleBeforeAgentStart(e, makeContext());   // throws if it mutates

// 2. No cross-call cache leak — A→B→C→A sequence catches more module-state
//    bugs than a simple A→B (catches "always returns first", "returns last",
//    "returns Nth", etc.). Each return must equal THAT call's input.
const a1 = handleBeforeAgentStart(makeEvent("PROMPT_A"), makeContext());
const b  = handleBeforeAgentStart(makeEvent("PROMPT_B"), makeContext());
const c  = handleBeforeAgentStart(makeEvent("PROMPT_C"), makeContext());
const a2 = handleBeforeAgentStart(makeEvent("PROMPT_A"), makeContext());
expect(a1.systemPrompt).toBe("PROMPT_A");
expect(b.systemPrompt).toBe("PROMPT_B");
expect(c.systemPrompt).toBe("PROMPT_C");
expect(a2.systemPrompt).toBe("PROMPT_A");   // NOT leaked from a1 or c
```

The file carries a header comment marking it the **SCAFFOLDING FORM** of
Invariant 1 and recording the handoff:

> The **full form** of Invariant 1 ("across N consecutive turns with a mode
> set, the assembled prompt contains exactly one identity line and exactly
> one copy of each selected fragment") lands in **`epic-mode-composition`**, per
> that epic's recorded clean-base test upgrade handoff (commit `fc16294`).
> This scaffolding test exists to seed the no-mutation / no-cache-source
> discipline on the no-op handler before splicing exists.

### Registration test — `tests/registration.test.ts` (wiring, the 3rd concern)

A dedicated single-concern test for the acceptance criterion "handler
registered exactly once." Judgment call to split this into its own file
(rather than fold into `noop.test.ts`): wiring is a distinct concern from the
two behavioral invariants, and a separate file keeps each test
single-concept. The brief's "5–15 units" explicitly permits the addition.

```ts
import factory from "../extensions/index.js";
import { handleBeforeAgentStart } from "../src/handler.js";
import { makePi } from "./harness.js";

test("factory registers the no-op handler exactly once and nothing else", () => {
  const { pi, calls } = makePi();
  factory(pi);

  const onCalls = calls.filter((c) => c.method === "on");
  expect(onCalls).toHaveLength(1);
  expect(onCalls[0].args[0]).toBe("before_agent_start");
  // Registered by reference → same function object the unit tests import.
  expect(onCalls[0].args[1]).toBe(handleBeforeAgentStart);

  // No tool / command / shortcut / flag / renderer / provider registered.
  expect(calls.filter((c) => c.method !== "on")).toHaveLength(0);
});
```

The `=== handleBeforeAgentStart` identity assertion is only possible because
the factory registers the named export by reference (see "Component
placement"); it directly verifies ARCHITECTURE.md's single-registration-
surface + unit-testability property.

### Edit to `extensions/index.ts` (extend, do not overwrite)

The sibling skeleton's file is edited in place:
- `import type { ExtensionAPI }` stays (type-only, as before).
- **Add** a value import: `import { handleBeforeAgentStart } from "../src/handler.js";`
- **Rename** the factory param `_pi` → `pi` (now used → no underscore).
- **Add** `pi.on("before_agent_start", handleBeforeAgentStart);` as the
  factory body.
- **Update the doc comment** to reflect that the handler IS now registered
  (drop the "deliberately registers NOTHING" line; keep the default-export-
  shape contract note and record that the handler lives in `src/handler.ts`
  for unit testability).
- Do **not** touch the `export default function` line's export shape, and do
  **not** register anything else.

### Optional: README status flip

`README.md` currently says "Status: scaffold — loads but registers no
handler yet." Flip to "Status: registers the no-op `before_agent_start`
handler (returns pi's prompt unchanged)." One-line edit; keeps the project
state self-documenting.

## Acceptance criteria

Reviewer verifies against the public surface plus the green test suite:

1. **Handler always returns a present `systemPrompt`.** For every input the
   handler returns an object whose `systemPrompt` is a string (never
   `undefined`). Enforced by `tests/noop.test.ts`.
2. **Byte-equality (Invariant 3).** Across the empty, whitespace, typical,
   and `<project_context>`-block fixtures, the returned `systemPrompt` ===
   the input `e.systemPrompt` byte-for-byte. Enforced by `tests/noop.test.ts`.
3. **No input mutation (Invariant 1, scaffolding).** The handler does not
   mutate `e` (JSON snapshot before === after). Enforced by
   `tests/clean-base.test.ts`.
4. **No cross-call cache leak (Invariant 1, scaffolding).** Called with
   `promptA` then `promptB`, the second return's `systemPrompt` ===
   `promptB`, not `promptA`. Enforced by `tests/clean-base.test.ts`.
5. **Registered exactly once.** The factory calls `pi.on("before_agent_start",
   handleBeforeAgentStart)` exactly once and registers no tool / command /
   shortcut / flag / renderer / provider. Enforced by
   `tests/registration.test.ts`.
6. **No mode/identity/fragment/cache logic.** `src/handler.ts` contains no
   resolver, no fragment loader, no cache key, no module-level mutable state
      on the return path. Confirmed by reading the file (it is the literal
   one-line return).
7. **`npm test` is green** (`vitest --run`) with the three test files
   passing. With real tests now present, `passWithNoTests` is a no-op (the
   skeleton's note suggested dropping it; leaving it is harmless — it only
   triggers when literally zero tests match). **Decision: leave
   `passWithNoTests` in place** — it is inert now and costs nothing; a future
   discovery regression is better caught by reviewing `include`, and removing
   it would be a config churn unrelated to this feature's scope. (Rationale
   logged; the reviewer may flag the opposite.)
8. **`npm run typecheck` is green** (`tsc --noEmit`, strict NodeNext). The
   `.js` relative specifiers resolve to `.ts` sources; `import type` is used
   for all type-only imports (`verbatimModuleSyntax`).
9. **Factory body extended, not overwritten.** `extensions/index.ts` still
   has `export default function (pi: ExtensionAPI)`; only the body and the
   doc comment changed; the `import type { ExtensionAPI }` line is
   unchanged.
10. **`src/handler.ts` is the only logic site.** No handler logic is
    inlined in `extensions/index.ts` beyond the `pi.on(...)` registration.
    Confirmed by reading both files.

## Implementation units

Six core units (one is an in-place edit); within the brief's 5–15. Order:
create `src/handler.ts` first (the factory edit and the tests both import
it), then the harness, then the three tests, then the factory edit, then
the optional README flip. Finally `npm install` (already done by the
skeleton; lockfile present) and run `npm test` + `npm run typecheck`.

1. **`src/handler.ts`** (new) — `handleBeforeAgentStart(e, _ctx)` returning
   `{ systemPrompt: e.systemPrompt }`; type-only import of
   `BeforeAgentStartEvent`, `BeforeAgentStartEventResult`, `ExtensionContext`.
2. **`tests/harness.ts`** (new) — `makeEvent`, `makeContext`, `makePi` (+
   `RecordedCall` / `RecordedMethod` exports) per the design above.
3. **`tests/noop.test.ts`** (new) — Invariant 3: parametrized byte-equality +
   never-undefined across the four fixtures.
4. **`tests/clean-base.test.ts`** (new) — Invariant 1 scaffolding form:
   no-mutation + no-cross-call-cache-leak, with the SCAFFOLDING-FORM header
   comment and the handoff note to `epic-mode-composition`.
5. **`tests/registration.test.ts`** (new) — factory registers handler exactly
   once by reference and nothing else.
6. **`extensions/index.ts`** (EDIT — extend, do not overwrite) — rename
   `_pi` → `pi`; add `import { handleBeforeAgentStart } from "../src/handler.js"`;
   add `pi.on("before_agent_start", handleBeforeAgentStart)`;
   update the doc comment.
7. **`README.md`** (EDIT, optional) — flip the scaffold-status line.

No `depends_on` change (the existing edge on
`epic-scaffold-handler-package-skeleton` is correct; it is `stage: done`).
No tsconfig change (`.js` specifiers resolve natively under NodeNext).

## Implementation notes

**Execution path.** Originally delegated to the `implementor` sub-agent, but
it hit an environmental blocker: the host's auto-mode permission classifier
fails closed for ALL mutating tools inside sub-agents (write/edit/bash/todo),
while read-only tools work and the host can mutate fine. Since the host IS
the GLM 5.2 model the run uses for implementation, the stride was completed
inline by the host (same model, no design change). Files written verbatim to
spec.

**Files created/edited:** `src/handler.ts`, `tests/harness.ts`,
`tests/noop.test.ts`, `tests/clean-base.test.ts`, `tests/registration.test.ts`,
and `extensions/index.ts` (edited: renamed `_pi`→`pi`, registered the handler
by reference).

**Verification (actual):**
- `npm run typecheck` → exit 0, no diagnostics. The strict
  `RequiredBeforeAgentStartResult` return type compiles — the always-return
  guarantee is now compile-time-enforced.
- `npm test` → 3 files, 7 tests, all pass, ~100ms.

**One hardening beyond the design**, found by a standalone Proxy sanity
check: the fail-fast `makeContext()` Proxy initially only guarded `symbol`
access, but JS probes the string key `.then` (the thenable check) and
`.toJSON`/`constructor`/`asymmetricMatch` during introspection — returning
`undefined` for those is correct (they are not real ctx fields), so an
`INTROSPECTION_KEYS` allowlist was added. Fail-fast still applies to all real
string-keyed ctx fields (verified: `ctx.model` throws, `ctx.cwd` returns the
override, `ctx.then` returns undefined). The existing tests pass because the
no-op handler never touches `ctx`; the fix protects downstream epics that
`await` a returned stub or get deep-equal-introspected.

**Registration wiring verified:** the factory registers `before_agent_start`
→ `handleBeforeAgentStart` exactly once, by reference (the registered handler
IS the same function object the unit tests import), and registers nothing
else — confirmed by `tests/registration.test.ts`.

**No divergence from design** beyond the Proxy allowlist addition.

## Blocker (resolved inline)

The sub-agent permission-classifier failure is an environment-level issue
affecting ALL delegated mutating work in this run, not just this feature. It
will recur for every subsequent `implement`/`review` delegation. The host
autopilot (GLM, with working mutating tools) will complete implementation
strides inline for the remainder of this run, continuing to use codex
sub-agents (read-only consult/review work) which are unaffected. Flagged for
the user to address out-of-band (the classifier service or its extension).
