---
id: epic-identity-injection-identity-derivation
kind: feature
stage: implementing
tags: [tests]
parent: epic-identity-injection
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Identity Derivation + Provider Display-Name Map

## Brief

This feature delivers the identity line itself — the pure derivation that
turns `ctx.model` into `You are {model.name} from {providerDisplayName}.` —
and the plugin-owned `provider → display-name` map it depends on. It is the
identity half of what ARCHITECTURE places in `src/assemble.ts` plus the
`src/provider-names.ts` module. The derivation is a pure function of the
model object: same model in, same line out, no per-turn state, no I/O. It
must be byte-deterministic (Invariant 2) — for a given `{ name, provider }`
it always produces the identical string, turn after turn.

The provider display-name map is **folded into this feature** (not a
standalone child) because it has exactly one consumer — this derivation —
and a map plus a title-case fallback is 1-2 implementation units, well below
a feature-floor. Splitting it would manufacture a tiny feature and force a
cross-feature type seam for zero parallelism gain (nothing else consumes the
map). `Provider` is a bare string id with no display field (verified against
`@earendil-works/pi-ai` types), so the map is the source of truth and the
sole maintenance surface when providers are added.

This feature does NOT cover: splicing the identity line into the prompt
(that is the handler-integration feature's job), the cache key or change
signal (cache-and-change-signal), capability metadata in the line (deferred
per SPEC out-of-scope), or `/mode:inspect` rendering (mode-inspect). It
hands downstream a pure `deriveIdentityLine(model): string` and the
display-name lookup, nothing more.

## Epic context

- Parent epic: `epic-identity-injection`
- Position in epic: **foundation feature (identity half) — no deps.** It
  produces the derivation + provider-name map that the handler-integration
  feature (assembles the line into the prompt on a cache miss) and the
  mode-inspect feature (renders the current identity) both consume. It is
  independent of the cache-and-change-signal feature and parallelizes with
  it.

## Foundation references

- `docs/SPEC.md` — "Identity line" (the format
  `You are {model.name} from {providerDisplayName(model.provider)}.`, the
  name+provider-only scope for v1, identity prepended as the first line),
  "Integration point: `before_agent_start`" (`ctx.model` shape:
  `{ id, name, provider, contextWindow, reasoning, ... }`, read fresh every
  turn).
- `docs/ARCHITECTURE.md` — "Components" (`src/provider-names.ts`,
  `src/assemble.ts`), "Key design properties" (identity leads the prompt —
  most-stable element, longest-lived cached prefix).
- `docs/VISION.md` — "What success looks like" (model knows what it is by
  name and provider on every turn; `/model` switch updates the line next
  turn because identity is derived per turn, never cached against a stale
  snapshot).

## Inherited design decisions (from parent epic)

These are locked in the epic's `## Design decisions`; this feature inherits
them and must not re-litigate:

- **Provider display-name source**: a plugin-owned `provider → display-name`
  map in `src/provider-names.ts`, keyed on pi's `KnownProvider` union, with a
  title-case fallback (`"openai"` → `"Openai"`) for unknown/custom provider
  ids. `Provider` is a bare string id with no display field, so the map is
  the source of truth.
- **Identity format**: `You are {model.name} from {providerDisplayName}.` —
  one line. Name + provider only for v1; capability metadata deferred.
- **Always inject**: identity is injected on every turn regardless of custom
  `SYSTEM.md` / `--system-prompt`. (The *splicing* of that decision is the
  handler-integration feature; this feature only produces the line.)

<!-- The design pass on this feature (`/agile-workflow:feature-design`) fills
in the `KnownProvider` map contents, the title-case fallback behavior, the
exact `deriveIdentityLine(model)` signature, and the byte-determinism test
(derivation is pure — Invariant 2's foundation at the line level). -->

## Design decisions

Resolved during the feature-design pass (delegated by an active autopilot
goal; advisory peer review was NOT run — the delegation forbids spawning
sub-agents, so type grounding was done by direct inspection of pi's installed
`.d.ts` instead). These are locked unless reopened:

- **Import path for pi's types is `@earendil-works/pi-ai`, NOT
  `@earendil-works/pi-coding-agent` root.** The autopilot delegation brief
  asserted `Model` is re-exported from the `pi-coding-agent` root; verified
  FALSE. `dist/index.d.ts` of `@earendil-works/pi-coding-agent` re-exports
  zero symbols from `pi-ai` — no `Model`, `Api`, `Provider`, or
  `KnownProvider`. Every internal module imports them directly from
  `@earendil-works/pi-ai` (e.g. `dist/core/extensions/types.d.ts`,
  `dist/core/model-registry.d.ts`). The package's `exports` map exposes only
  `.`, so deep imports into `dist/...` are blocked under `moduleResolution:
  NodeNext`. Therefore the only public path to the `Model` / `KnownProvider`
  types is `import type { ... } from "@earendil-works/pi-ai"`. **DIVERGENCE
  FROM THE DELEGATION BRIEF — flagged in the run report.**
- **`@earendil-works/pi-ai` must be added to `devDependencies`.** It is
  currently only a transitive dep (via `pi-coding-agent`). The import is
  type-only, and `verbatimModuleSyntax: true` + `import type` erases it at
  emit, so there is NO runtime dependency — `devDependencies` is the
  conventional home and keeps the dependency graph honest. (No version pin
  beyond `*` is needed; it tracks whatever `pi-coding-agent` resolves.)
- **Signature: `deriveIdentityLine(model: Model<any>): string`.** Matches
  pi's own contextual type for `ctx.model`, which is `Model<any> | undefined`
  in `ExtensionContext` (`dist/core/extensions/types.d.ts:222`) and
  `Model<any>` on the setter/swap surfaces. Considered the generic
  `<TApi extends Api>(model: Model<TApi>): string` — rejected: it requires
  importing `Api`, adds a type parameter callers never name, and diverges
  from pi's own ctx-facing idiom. The function reads only `model.name` and
  `model.provider`, both of which are `TApi`-invariant, so `Model<any>` is
  lossless here.
- **Provider map type: `Readonly<Record<KnownProvider, string>>`.** This
  makes completeness a COMPILE-TIME invariant: TypeScript errors if any
  `KnownProvider` id is missing an entry. That directly serves the epic's
  "sole maintenance surface when providers are added" concern — adding a
  provider to pi's union without updating the map fails the build, not a
  silent fallback. The `Readonly<>` wrapper prevents in-place mutation.
- **`providerDisplayName(provider: string)` param is `string`, not
  `Provider`.** `Provider = KnownProvider | string` collapses to `string`
  at the type level, so `string` is the honest parameter type. The lookup
  uses `PROVIDER_DISPLAY_NAMES[provider as KnownProvider]` (the cast is
  indexing-only; runtime returns `undefined` for unknown keys) with
  `?? titleCaseId(provider)` as the fallback.
- **Title-case fallback: split on `[\s\-_.]+`, drop empties, uppercase first
  char + lowercase the tail of each segment, join with single spaces.**
  Lowercasing the tail matches the epic's illustrative `"openai" -> "Openai"`
  and the textbook definition of title-case. Provider ids are conventionally
  lowercase-kebab (every member of `KnownProvider` is), so the tail-lowering
  never destroys deliberate casing in practice. Edge cases: `""` -> `""`,
  `"foo--bar"` -> `"Foo Bar"` (repeated separators collapse),
  `"my-custom"` -> `"My Custom"` (the delegation brief's example).
- **`openai-codex` maps to `"OpenAI"`.** The delegation brief's example list
  omitted `openai-codex`, but it IS a member of pi's canonical
  `KnownProvider` union — and Codex is OpenAI's product line. Filling it is
  non-negotiable because `Record<KnownProvider, string>` makes a missing key
  a compile error.
- **No child stories.** Three files, single-stride, tight cohesion (every
  test exercises `deriveIdentityLine` / `providerDisplayName` together),
  well under the feature floor. Per feature-design Phase 7, spawning stories
  here is pure overhead — the feature IS the implementation unit.
- **`makeModel` test factory stays local to `tests/identity.test.ts`.** The
  delegation brief scopes this feature to exactly three files. A richer
  model factory will be wanted by `handler-integration` later; promoting it
  to `tests/harness.ts` is that feature's call, not this one's.

## Architectural choice

Three pure modules, no pi runtime coupling, fully unit-testable in process.
The only external touch is the type-only import from `@earendil-works/pi-ai`;
there is no `ExtensionContext`, no `ctx`, no event, no pi import on the hot
path. This is the cleanest realization of ARCHITECTURE's unit-testability
property and the epic's "pure function of the model object" requirement.

The provider map lives in its own module (`src/provider-names.ts`) rather
than being inlined into `src/identity.ts` because: (a) the epic names it as
a distinct component in ARCHITECTURE's layout, (b) `mode-inspect` will also
want `providerDisplayName` for its `Identity: GLM-4.6 (Zhipu AI)` line — so
it is a sibling consumer, not a private helper — and (c) isolating the
static data makes the exhaustiveness-typed `Record<KnownProvider, string>`
its own small, reviewable surface.

`src/identity.ts` owns only the one-line derivation and re-exports nothing
of the provider map; it imports `providerDisplayName` by name so the seam is
explicit and a future swap of the map is a one-line change.

## Implementation Units

### Unit 1: Provider display-name map + lookup — `src/provider-names.ts`

**File**: `src/provider-names.ts`

```ts
import type { KnownProvider } from "@earendil-works/pi-ai";

/**
 * Plugin-owned source of truth for provider id -> display name.
 * Typed `Readonly<Record<KnownProvider, string>>` so completeness is a
 * compile-time invariant: adding a provider to pi's `KnownProvider` union
 * without adding an entry here is a type error, not a silent fallback.
 */
export const PROVIDER_DISPLAY_NAMES: Readonly<Record<KnownProvider, string>> = {
  "amazon-bedrock":          "Amazon Bedrock",
  "ant-ling":                "Ant Group",
  "anthropic":               "Anthropic",
  "google":                  "Google",
  "google-vertex":           "Google Vertex AI",
  "openai":                  "OpenAI",
  "azure-openai-responses":  "Azure OpenAI",
  "openai-codex":            "OpenAI",
  "nvidia":                  "NVIDIA",
  "deepseek":                "DeepSeek",
  "github-copilot":          "GitHub Copilot",
  "xai":                     "xAI",
  "groq":                    "Groq",
  "cerebras":                "Cerebras",
  "openrouter":              "OpenRouter",
  "vercel-ai-gateway":       "Vercel",
  "zai":                     "Zhipu AI",
  "zai-coding-cn":           "Zhipu AI",
  "mistral":                 "Mistral AI",
  "minimax":                 "MiniMax",
  "minimax-cn":              "MiniMax",
  "moonshotai":              "Moonshot AI",
  "moonshotai-cn":           "Moonshot AI",
  "huggingface":             "Hugging Face",
  "fireworks":               "Fireworks AI",
  "together":                "Together AI",
  "opencode":                "OpenCode",
  "opencode-go":             "OpenCode",
  "kimi-coding":             "Moonshot AI",
  "cloudflare-workers-ai":   "Cloudflare",
  "cloudflare-ai-gateway":   "Cloudflare",
  "xiaomi":                  "Xiaomi",
  "xiaomi-token-plan-cn":    "Xiaomi",
  "xiaomi-token-plan-ams":   "Xiaomi",
  "xiaomi-token-plan-sgp":   "Xiaomi",
};

/**
 * Title-case an unknown/custom provider id so it renders sensibly in the
 * identity line. Splits on whitespace, dash, underscore, and dot; drops
 * empty segments (collapsing repeated separators); uppercases the first
 * character and lowercases the tail of each segment; joins with a single
 * space. `""` -> `""`.
 */
function titleCaseId(id: string): string {
  return id
    .split(/[\s\-_.]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Resolve a provider id (pi's `Provider`, a bare string) to a display name.
 * Known ids hit the map; unknown/custom ids fall back to title-case so the
 * identity line is always well-formed.
 */
export function providerDisplayName(provider: string): string {
  return PROVIDER_DISPLAY_NAMES[provider as KnownProvider] ?? titleCaseId(provider);
}
```

**Implementation Notes**:
- The 35 keys are the complete canonical `KnownProvider` union from
  `@earendil-works/pi-ai` `dist/types.d.ts` (verified). Do NOT prune any —
  `Record<KnownProvider, string>` makes omission a compile error.
- `kimi-coding` -> `"Moonshot AI"`: Kimi is Moonshot's consumer product; the
  display name tracks the company, not the product, for consistency with
  `moonshotai` / `moonshotai-cn`.
- `xiaomi-token-plan-{cn,ams,sgp}` -> `"Xiaomi"`: these are regional billing
  variants of the same provider; one display name.
- The `as KnownProvider` cast inside `providerDisplayName` is indexing-only;
  JS returns `undefined` for any string key not present, so the `??` fallback
  is the live path for custom ids.

**Acceptance Criteria**:
- [ ] Every member of pi's `KnownProvider` union is a key in
      `PROVIDER_DISPLAY_NAMES` (enforced by `Record<KnownProvider, string>`;
      `tsc --noEmit` fails otherwise).
- [ ] `providerDisplayName("zai")` === `"Zhipu AI"`.
- [ ] `providerDisplayName("openai")` === `"OpenAI"`.
- [ ] `providerDisplayName("my-custom")` === `"My Custom"` (title-case
      fallback).
- [ ] `providerDisplayName("")` === `""` (no throw, well-defined).

---

### Unit 2: Identity-line derivation — `src/identity.ts`

**File**: `src/identity.ts`

```ts
import type { Model } from "@earendil-works/pi-ai";
import { providerDisplayName } from "./provider-names.js";

/**
 * Derive the identity line from a pi model object.
 *
 * Pure: reads `model.name` and `model.provider` only — no mutation, no I/O,
 * no pi runtime coupling beyond the `import type`. Same model in => same
 * string out, every call (byte-deterministic; the line-level foundation of
 * SPEC Invariant 2).
 *
 * Format: `You are {model.name} from {providerDisplayName(model.provider)}.`
 */
export function deriveIdentityLine(model: Model<any>): string {
  return `You are ${model.name} from ${providerDisplayName(model.provider)}.`;
}
```

**Implementation Notes**:
- `model.provider` is typed `Provider` (= `string`), which
  `providerDisplayName(provider: string)` accepts directly — no cast at the
  call site.
- Use a template literal; do NOT concatenate with `+` (the period is a
  literal suffix, not a sentence end that needs special handling).
- The relative import MUST carry the `.js` extension
  (`./provider-names.js`) — `moduleResolution: NodeNext` +
  `verbatimModuleSyntax` require it (matches the existing
  `src/handler.ts` -> `extensions/index.ts` convention of `../src/handler.js`).
- An empty or whitespace `model.name` is the caller's problem; this function
  stays well-formed (exactly one space on each side of the name, trailing
  period). Tests assert the structural shape, not name validity.

**Acceptance Criteria**:
- [ ] `deriveIdentityLine({ name: "GLM-4.6", provider: "zai", ... })` ===
      `"You are GLM-4.6 from Zhipu AI."`.
- [ ] Output is byte-identical across N repeated calls with the same model
      (purity / determinism).
- [ ] The input model object is not mutated (assertable via a frozen input).
- [ ] `tsc --noEmit` clean; no `any` escapes the function's return type.

---

### Unit 3: Tests — `tests/identity.test.ts`

**File**: `tests/identity.test.ts`

```ts
import { describe, it, expect } from "vitest";
import type { Model } from "@earendil-works/pi-ai";
import { deriveIdentityLine } from "../src/identity.js";
import {
  PROVIDER_DISPLAY_NAMES,
  providerDisplayName,
} from "../src/provider-names.js";

/** Minimal `Model<any>` factory — only `name` and `provider` matter for
 *  identity; the rest are filled with harmless defaults. Local to this
 *  feature; handler-integration may promote a richer factory to harness.ts. */
function makeModel(
  overrides: Partial<Model<any>> & Pick<Model<any>, "name" | "provider">,
): Model<any> {
  return {
    id: "test-model",
    api: "openai-responses" as any,
    baseUrl: "https://api.example.com",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
    ...overrides,
  };
}
```

**Test groups** (each a `describe` block):

1. **`providerDisplayName` — known providers**: an `it.each` over a
   representative locked-pairs table asserting the exact display string —
   `["anthropic","Anthropic"]`, `["openai","OpenAI"]`,
   `["google-vertex","Google Vertex AI"]`, `["github-copilot","GitHub Copilot"]`,
   `["xai","xAI"]`, `["zai","Zhipu AI"]`, `["zai-coding-cn","Zhipu AI"]`,
   `["kimi-coding","Moonshot AI"]`, `["cloudflare-workers-ai","Cloudflare"]`,
   `["openai-codex","OpenAI"]`, `["xiaomi-token-plan-sgp","Xiaomi"]`.
2. **`providerDisplayName` — completeness over the KnownProvider union**:
   hardcode the full 35-id canonical list as `const KNOWN_IDS = [...] as
   const`, assert `KNOWN_IDS.every((id) => PROVIDER_DISPLAY_NAMES[id]` is a
   non-empty string AND `providerDisplayName(id)` does not equal the
   title-cased id (i.e. it hit the map, not the fallback). This is the
   exhaustiveness guardrail at runtime; the compile-time guardrail is the
   `Record<KnownProvider, string>` type.
3. **`providerDisplayName` — title-case fallback**: `it.each` over
   `["my-custom","My Custom"]`, `["acme-corp","Acme Corp"]`,
   `["foo--bar","Foo Bar"]`, `["a.b.c","A B C"]`, `["","""]`.
4. **`deriveIdentityLine` — exact format**: a sample model
   `{ name: "GLM-4.6", provider: "zai" }` ->
   `"You are GLM-4.6 from Zhipu AI."`; and
   `{ name: "Claude Opus 4.7", provider: "anthropic" }` ->
   `"You are Claude Opus 4.7 from Anthropic."`.
5. **`deriveIdentityLine` — provider rendered via display name**: assert the
   line contains `"from OpenAI."` (not `"from openai."`) for an `openai`
   model, and `"from Google Vertex AI."` for `google-vertex`.
6. **`deriveIdentityLine` — unknown provider title-cased in the line**:
   `{ name: "X", provider: "my-custom" }` -> `"You are X from My Custom."`.
7. **`deriveIdentityLine` — empty / edge names**: `name: ""` ->
   `"You are  from Anthropic."` (structural shape preserved: one space each
   side, trailing period); `name: "GPT-5.5 (codex)"` ->
   `"You are GPT-5.5 (codex) from OpenAI."`.
8. **`deriveIdentityLine` — purity / no mutation**: build a model, freeze it
   with `Object.freeze`, snapshot it (`structuredClone`), call the function
   N times, assert each output equals the first AND the frozen input still
   deep-equals the snapshot (freeze would throw on any write attempt, so the
   equality check is defense-in-depth).

**Acceptance Criteria**:
- [ ] All groups pass under `vitest --run`.
- [ ] The completeness group lists all 35 `KnownProvider` ids (matches the
      map; stays meaningful if pi adds a provider — it'll either fail to
      compile or fail this test, surfacing the gap either way).
- [ ] No test games the assertion — each asserts a concrete expected string.

## Implementation Order

1. Add `@earendil-works/pi-ai` to `devDependencies` in `package.json`
   (type-only; track `pi-coding-agent`'s resolution, version `*` is fine).
2. `src/provider-names.ts` (Unit 1) — the map + `providerDisplayName`. Land
   this first because Unit 2 imports from it.
3. `src/identity.ts` (Unit 2) — the one-line derivation.
4. `tests/identity.test.ts` (Unit 3) — all eight groups.
5. `npm run typecheck` (must be clean — the `Record<KnownProvider, string>`
   type is the exhaustiveness gate) and `npm test` (all green).

Single stride, no parallelism. The implementor advances the feature
`stage: implementing -> review` once both commands are green.

## Public API surface (consumed downstream)

This feature exports, from `src/provider-names.ts`:
- `PROVIDER_DISPLAY_NAMES` — the static map (consumed by tests; available to
  `mode-inspect` if it wants to render a raw lookup).
- `providerDisplayName(provider: string): string` — the lookup + fallback.

and from `src/identity.ts`:
- `deriveIdentityLine(model: Model<any>): string` — consumed by
  `handler-integration` (splice into the prompt on a cache miss) and
  `mode-inspect` (render the `Identity: ...` line).

## Risks

- **`@earendil-works/pi-ai` resolution under `NodeNext`.** Mitigated: the
  package is physically in `node_modules` (transitive via `pi-coding-agent`)
  and the import is type-only (`verbatimModuleSyntax` strips it). Adding it
  to `devDependencies` makes the dependency explicit. If, contrary to
  verification, a future `pi-coding-agent` release DID re-export `Model` from
  its root, the import path is a one-line change.
- **Map drift as pi adds providers.** Mitigated two ways: the
  `Record<KnownProvider, string>` type makes a missing key a compile error,
  AND test group 2 makes a missing key a runtime test failure. The gap is
  surfaced either way.
- **Title-case fallback surprises on a deliberately-mixed-case custom id**
  (e.g. a user registering `"FooBar"` as a custom provider gets
  `"Foobar"`). Accepted: provider ids are conventionally lowercase-kebab
  (the entire `KnownProvider` union is), so the realistic input space never
  hits this. If a user reports it, the fix is to add their id to the map or
  relax the fallback to preserve tail-casing — a deliberate future call, not
  a v1 risk.
