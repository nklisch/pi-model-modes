---
id: epic-mode-composition-preset-table
kind: feature
stage: review
tags: [tests]
parent: epic-mode-composition
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Preset Table — ResolvedMode type + presets.json schema/loader

## Brief

This feature delivers `src/presets.ts` and `presets.json`: the preset table that
bundles known-good component combinations under a single name, plus the shared
`ResolvedMode` selection type the rest of the engine builds against. A preset is
`{ base, agency, quality, scope, modifiers[] }`; selecting a preset selects all
components atomically. This feature owns the **`ResolvedMode` contract** (the
type `mode-resolver` produces and `deterministic-splice` consumes) and the
loader/validator for `presets.json`.

A central representational decision lands here: **`base: "pi"`** is the explicit
default sentinel meaning "pi's own voice, no base overlay" — distinct from
`NO_MODE_SIGNATURE = ""` (which means no mode at all). A resolved mode with
`base: "pi"` is still a real mode with a non-empty signature; it simply contributes
no base-overlay fragment to the splice.

This feature does NOT resolve precedence or compute the signature (that is
`mode-resolver`), does NOT load fragment content (that is `fragment-loader`), and
ships only a minimal starter `presets.json` (a couple of presets over the starter
fragment set) — the full preset catalog rides with later content work.

## Epic context

- Parent epic: `epic-mode-composition`
- Position in epic: **foundation — no deps; defines the `ResolvedMode` type
  `mode-resolver` and `deterministic-splice` depend on.** Parallelizes with
  `fragment-loader`.

## Foundation references

- `docs/SPEC.md` — "Mode composition" (`mode = base + agency + quality + scope +
  {modifiers}`; preset = named bundle; base default = pi's own).
- `docs/ARCHITECTURE.md` — "Components" (`src/presets.ts`, `presets.json` named
  bundles).

## Inherited / epic design decisions (do not re-litigate)

- **Preset selects atomically**: a preset name expands to all five components.
- **`base: "pi"` default sentinel**, distinct from `NO_MODE_SIGNATURE = ""`
  (resolved in the epic's codex advisory).
- **Validation fail-fast** (this feature's slice): unknown preset name, duplicate
  preset ids, or a preset referencing an undefined axis value fails fast.

## Design decisions

Resolved under autopilot delegation (scope `--all`). Implementation tier: OPUS.
These extend the locked epic/feature decisions; they do not override them.

### Axis values: validated strings, NOT closed typed unions

`ResolvedMode.agency / quality / scope` and `modifiers[]` are typed as plain
`string` / `string[]`, **not** closed string-literal unions. Rationale:

- The axis VALUES are **convention-discovered fragment files** (sibling
  `fragment-loader` reads `prompts/axis/agency/*.md`, `quality/*.md`,
  `scope/*.md`, `modifiers/*.md` — drop a `.md` in and it is a new selectable
  value, no code change, per the epic's "Fragment layout and discovery"
  decision). A closed union baked into `presets.ts` would **drift** from the
  on-disk fragment set the moment anyone adds a fragment, and would force a
  type edit for every content addition — exactly the coupling the
  convention-directory design exists to avoid.
- The SPEC enumerations (agency ∈ {autonomous,collaborative,surgical,partner},
  etc.) are the *current* catalog, not a frozen contract. `presets.ts` must not
  hard-code them as types.
- **Tradeoff accepted:** we lose compile-time "is this a known agency value?"
  checking inside `presets.json`. We recover it at runtime via *shape*
  validation here (the value is a non-empty string) and *existence* validation
  downstream (see next decision). This is the Fail-Fast principle applied at the
  right boundary: the preset table cannot know the discovered fragment set, so
  it validates what it CAN (well-formedness), and the resolver — which holds the
  discovered set — validates existence.

A single exception: `base` is the one axis with a meaningful **sentinel**
(`"pi"`), so the type documents that string specially (see below), but it is
still typed `string` (a non-`"pi"` value names a `prompts/base/*.md` overlay).

### Where axis-existence validation lives — split by who holds the fragment set

Three validation tiers, each at the boundary that owns the relevant knowledge:

| Validation | Owner | When | Why here |
|---|---|---|---|
| **Well-formedness** of a preset (all five components present; `base`/`agency`/`quality`/`scope` are non-empty strings; `modifiers` is a string array; no duplicate preset ids; parse succeeds) | `presets.ts` (THIS feature) | at load (`loadPresets()`) | The preset table owns the JSON schema; it can fully judge shape without any fragment knowledge. |
| **Unknown-preset lookup miss** | `presets.ts` (THIS feature) | at `getPreset(name)` | The table is the registry; a miss is its to throw. |
| **Axis-value existence** (does `agency:"autonomous"` correspond to a real discovered `prompts/axis/agency/autonomous.md`?) | `resolver.ts` (sibling `mode-resolver`, NOT here) | at resolution | Only the resolver holds the discovered fragment set (from `fragment-loader`). `presets.ts` deliberately does NOT cross-check axis-value existence — it cannot without coupling to the loader, and doing so would duplicate the resolver's authority. The epic's locked decision already assigns "resolved selection missing a required axis fragment" to `mode-resolver`. |

This is the key documented judgement for requirement 3: **the preset table
validates SHAPE, the resolver validates EXISTENCE.** A `presets.json` entry with
`agency:"banana"` parses and loads fine here (it is a well-formed non-empty
string); it fails fast later at the resolver when no `banana.md` is discovered.
The starter `presets.json` we ship references only real starter fragments, so
this split is invisible in practice — it only matters for hand-edited presets.

### How `presets.json` is loaded/resolved — package-relative via `import.meta.url`

`presets.json` is bundled package data at the repo root (a sibling of
`prompts/`). We load it the SAME way the sibling `fragment-loader` resolves
`prompts/` — **package-relative `import.meta.url` + `fileURLToPath` +
`readFileSync`**, NOT a static JSON import. Rationale:

- **Consistency** with `fragment-loader` (the epic note: "the sibling
  fragment-loader resolves bundled files via `import.meta.url`; be consistent").
  One file-resolution idiom across the engine.
- **Static JSON import friction:** under `verbatimModuleSyntax` + `NodeNext` +
  ESM, `import presets from "../presets.json" with { type: "json" }` requires
  import attributes and ties module-load to bundler/Node JSON-attribute support;
  it also gives no clean seam for a test override. `readFileSync` + `JSON.parse`
  is the lower-friction, test-overridable choice. (`resolveJsonModule` is on in
  tsconfig, but we choose not to rely on a static import for the reasons above.)
- **Test override:** `loadPresets(opts?: { json?: string })` accepts an
  optional raw-JSON string. When provided, it parses that instead of reading
  disk — so tests exercise duplicate-id / malformed / custom-preset cases
  without touching the bundled file. Default (no `opts`) reads the real
  `presets.json` package-relative.

Resolution: `fileURLToPath(new URL("../presets.json", import.meta.url))`. From
`src/presets.ts` (compiled/run as `src/presets.js` in an ESM package), `../`
resolves to the package root where `presets.json` lives. Add `presets.json` and
`prompts/**` to the package `files` allowlist at publish time (flagged as a Risk
— the sibling fragment-loader carries the same obligation for `prompts/`).

### The `base:"pi"` representation — explicit default sentinel

`ResolvedMode.base` is `string`, and the value **`"pi"`** is the explicit
default sentinel: "pi's own voice, no base overlay." It is a real, named base
value (a mode with `base:"pi"` is a real mode), but it is the one base value
that the resolver/splice treat as contributing **no base-overlay fragment** —
there is intentionally no `prompts/base/pi.md`; `"pi"` means "skip the base
slot." Any other `base` value names a `prompts/base/<value>.md` overlay.

Distinction from `NO_MODE_SIGNATURE` (made prominent per requirement 1):

- `NO_MODE_SIGNATURE = ""` (from `src/cache.ts`) means **no mode at all** — the
  user has not selected a mode; the engine injects identity only (Invariant 3).
  There is no `ResolvedMode` object in this state.
- `base:"pi"` lives **inside** a fully-populated `ResolvedMode` — the user HAS
  selected a mode (e.g. a preset whose base is pi's own voice). It still
  contributes agency/quality/scope/modifier fragments and produces a **non-empty
  signature**. It simply omits the base-overlay slot.

Conflating them would break Invariant 3 (a real pi-base mode would be mistaken
for no-mode and drop its axis fragments). We surface the sentinel as an exported
named constant `PI_BASE = "pi"` so the resolver and splice reference one symbol,
never a bare string literal.

## Architectural choice

A single pure data/type module `src/presets.ts` plus a minimal starter
`presets.json` data file. The module:

1. Exports the **`ResolvedMode`** shared selection contract (the type
   `mode-resolver` produces and `deterministic-splice` consumes) — the single
   source of truth for the resolved-mode shape, defined HERE so both downstream
   consumers import it from one place.
2. Exports the **`Preset`** type (the on-disk schema, structurally identical to a
   `ResolvedMode` minus the runtime-only concerns — a preset IS a named
   `ResolvedMode` template).
3. Exports `loadPresets()` (parse + validate + build the registry, fail-fast) and
   `getPreset(name)` (lookup, fail-fast on miss) — the loader/lookup surface.
4. Exports the `PI_BASE` sentinel constant and reuses `NO_MODE_SIGNATURE` framing
   from `cache.ts` (referenced, not redefined) for the documented distinction.

Pure module, no pi-runtime imports (matches `cache.ts` / `identity.ts` /
`provider-names.ts` conventions): fully unit-testable, deterministic, fail-fast
at boundaries. Module-scope memoization of the loaded registry is permitted (the
bundled `presets.json` does not change within a process), with a
`resetPresetsForTesting()` escape hatch mirroring `resetCacheForTesting()`.

**Child stories: NONE — one cohesive single stride.** Rationale: this is one
small pure module (a type + a schema + a ~2-function loader/validator) plus one
tiny data file, all in lock-step (the validator validates the schema the type
describes; the starter data exercises both). There is no internal dependency
seam to parallelize and no coordination surface. Splitting it would create
churny cross-references for no benefit. The implementor builds `src/presets.ts`,
`presets.json`, and `tests/presets.test.ts` in a single pass. (Consistent with
the sibling foundation features in this epic, which are likewise single-stride.)

## Implementation Units

### Unit 1 — `src/presets.ts` (the module)

Exact types and signatures (match `cache.ts` doc-comment + `Readonly` idioms):

```ts
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

/**
 * The default base sentinel: "pi's own voice, no base overlay." A real,
 * selectable base value, distinct from NO_MODE_SIGNATURE ("" = no mode at
 * all). A ResolvedMode with base === PI_BASE is a real mode (non-empty
 * signature, full axis fragments) that simply contributes no base-overlay
 * fragment. There is intentionally no prompts/base/pi.md.
 */
export const PI_BASE = "pi";

/**
 * The shared resolved-mode selection contract — the single source of truth
 * for a resolved mode's shape. `mode-resolver` PRODUCES this; `assemble.ts`
 * (deterministic-splice) CONSUMES it. Axis values are validated strings, NOT
 * closed unions: the discovered fragment set (convention dirs) is the real
 * catalog, so a closed union would drift. Existence of each value is checked
 * by the resolver against the discovered fragments; this type asserts only
 * the SHAPE.
 *
 *   base       — "pi" (PI_BASE, no overlay) or a prompts/base/<base>.md name
 *   agency     — a prompts/axis/agency/<agency>.md name
 *   quality    — a prompts/axis/quality/<quality>.md name
 *   scope      — a prompts/axis/scope/<scope>.md name
 *   modifiers  — zero or more prompts/modifiers/<mod>.md names, in
 *                preset-declared order (duplicate de-dup is a resolver concern)
 */
export interface ResolvedMode {
  base: string;
  agency: string;
  quality: string;
  scope: string;
  modifiers: string[];
}

/**
 * A preset as stored in presets.json: a named ResolvedMode template. Selecting
 * a preset expands ATOMICALLY to all five components. Structurally a
 * ResolvedMode (the name lives in the registry key, not the value).
 */
export interface Preset {
  base: string;
  agency: string;
  quality: string;
  scope: string;
  modifiers: string[];
}

/** The on-disk shape of presets.json: a name -> Preset object map. */
export type PresetFile = Readonly<Record<string, Preset>>;

/** The in-memory registry after load + validation. */
export type PresetRegistry = Readonly<Record<string, Preset>>;

/** Options for loadPresets — `json` overrides disk read (test seam). */
export interface LoadPresetsOptions {
  /** Raw presets.json text to parse instead of reading the bundled file. */
  json?: string;
}

/**
 * Parse + validate presets.json and return the registry. Fail-fast:
 *  - JSON.parse failure                      -> throw (malformed file)
 *  - top level not a plain object            -> throw
 *  - a preset missing/!string base/agency/quality/scope -> throw (names id)
 *  - a preset whose base/agency/quality/scope is ""      -> throw
 *  - a preset whose modifiers is not a string[]          -> throw
 *  - a modifier entry that is not a non-empty string     -> throw
 * Duplicate preset IDS: a JSON object cannot hold duplicate keys at the value
 * level (last wins), so duplicate-id detection is done on the RAW TEXT before
 * JSON.parse (see validateNoDuplicateIds). This is the documented mechanism
 * for the locked "duplicate preset ids throw at load" requirement.
 *
 * NOTE: does NOT validate axis-VALUE existence against discovered fragments —
 * that is mode-resolver's job (it holds the fragment set). This validates
 * SHAPE only.
 */
export function loadPresets(opts?: LoadPresetsOptions): PresetRegistry;

/**
 * Look up a preset by name. Fail-fast: throws a clear error naming the unknown
 * preset AND listing the available names. Returns the Preset (a ResolvedMode
 * template) on hit. Selecting = expanding atomically to all components, so
 * callers spread it into a ResolvedMode directly.
 */
export function getPreset(name: string, registry: PresetRegistry): Preset;

/** TEST-ONLY: clear the memoized registry so the next loadPresets re-reads. */
export function resetPresetsForTesting(): void;
```

Implementation notes:

- **Disk path:** `fileURLToPath(new URL("../presets.json", import.meta.url))`,
  read with `readFileSync(path, "utf8")`. Memoize the parsed registry in a
  module-scope `let cachedRegistry: PresetRegistry | undefined`; `loadPresets()`
  with no `opts.json` returns the memo if present. When `opts.json` is supplied,
  parse it fresh and DO NOT memoize (test inputs must not poison the module memo)
  — or memoize only the disk path. `resetPresetsForTesting()` clears the memo.
- **Duplicate-id detection** (`validateNoDuplicateIds(rawText)`): because
  `JSON.parse` silently keeps the last value for a repeated key, scan the raw
  text for duplicate top-level keys before parsing. Minimal robust approach:
  parse once to get the object, then re-scan raw text counting top-level
  `"<key>":` occurrences; if any canonical preset name appears as a top-level
  key more than once, throw naming the duplicate. (Document this as the chosen
  mechanism; a stricter streaming parser is overkill for a tiny bundled file.)
  Keep it simple and well-commented — this is the one non-obvious validator.
- **Error messages** match the `cache.ts` fail-fast voice: `throw new Error(...)`
  with a specific, actionable message (which preset, which field, and for
  lookup-miss, the available names) — e.g.
  `\`unknown preset "<name>" — available: <a, b, c>\``,
  `\`preset "<name>": "agency" must be a non-empty string\``,
  `\`duplicate preset id "<name>" in presets.json\``.
- **No pi-runtime imports.** Node builtins (`node:url`, `node:fs`) only, mirroring
  `cache.ts`'s `node:crypto` usage.

### Unit 2 — `presets.json` (minimal starter data)

Ships a COUPLE of presets over the starter fragment set (the sibling
fragment-loader ships one fragment per axis + a couple of base/modifier
starters). Design content (implementor creates the file; values must reference
fragments the starter set actually provides — coordinate with fragment-loader's
starter set; if a referenced axis value isn't in the starter set, either add it
to the starter set or pick one that is). Proposed starter:

```json
{
  "default": {
    "base": "pi",
    "agency": "collaborative",
    "quality": "pragmatic",
    "scope": "adjacent",
    "modifiers": []
  },
  "flow": {
    "base": "pi",
    "agency": "autonomous",
    "quality": "pragmatic",
    "scope": "adjacent",
    "modifiers": ["flow"]
  }
}
```

- `"default"` uses `base:"pi"` with no modifiers — the canonical
  base:"pi"-vs-no-mode test fixture, and a sane config default.
- `"flow"` exercises a non-empty `modifiers[]` and a non-`collaborative` agency.
- Both keep `base:"pi"` (the starter base set may only have pi + maybe one
  overlay; do not reference a base overlay the starter set lacks). If the
  fragment-loader starter ships a base overlay (e.g. `chill`), a third preset
  exercising a non-pi base MAY be added — but only if that overlay exists. Keep
  it minimal; the full catalog ("explore", "create", etc.) rides later content
  work, per the Brief.

### Unit 3 — `tests/presets.test.ts` (the tests)

Vitest, `tests/` conventions (`describe`/`it`/`it.each`, import from
`../src/presets.js`). See Testing section for cases.

## Implementation Order

Single stride, one pass:

1. Write `src/presets.ts` — types (`ResolvedMode`, `Preset`, `PresetFile`,
   `PresetRegistry`, `LoadPresetsOptions`), `PI_BASE`, `loadPresets`,
   `getPreset`, `resetPresetsForTesting`, the private validators.
2. Write `presets.json` (starter content above).
3. Write `tests/presets.test.ts`.
4. `npm run build` (typecheck) + `npm test` green.

No internal ordering dependency beyond "module before its test." No child
stories, no worktree isolation, no coordination.

## Testing

Test integrity (per `.agents/rules/agile-workflow.md`): tests assert the
SPEC/feature contract, never reshape to pass. Cases:

- **Preset lookup (hit):** `getPreset("flow", reg)` returns the exact starter
  object `{ base:"pi", agency:"autonomous", quality:"pragmatic",
  scope:"adjacent", modifiers:["flow"] }`.
- **Atomic expansion:** the returned preset carries ALL five components in one
  object — selecting a preset yields every axis at once (no partial selection).
  Assert the full shape, including empty `modifiers: []` for `"default"`.
- **Unknown-preset fail-fast:** `getPreset("nope", reg)` throws, and the message
  names the unknown preset AND lists available names (`default`, `flow`).
- **Duplicate-id fail-fast:** `loadPresets({ json: '{"flow":{...},"flow":{...}}' })`
  throws a duplicate-id error naming `flow` (uses the raw-text override seam;
  proves the documented raw-text duplicate detection actually fires, since
  `JSON.parse` alone would silently drop the first).
- **Malformed-shape fail-fast:** `loadPresets({ json: ... })` with (a) non-object
  top level, (b) a preset missing `scope`, (c) a preset with `agency: ""`, (d) a
  preset with `modifiers: "flow"` (string not array) — each throws a specific,
  field-naming error.
- **`base:"pi"` vs no-mode distinction:** assert `PI_BASE === "pi"` and
  `NO_MODE_SIGNATURE === ""` (import the latter from `../src/cache.js`) are
  distinct; assert the `"default"` preset has `base === PI_BASE` and is a
  fully-populated `ResolvedMode` (a real mode), documenting in the test that this
  is NOT the no-mode state. (The signature itself is computed by the resolver;
  here we only assert the representational distinction this feature owns.)
- **Starter-set sanity / load-from-disk:** `loadPresets()` (no opts, real file)
  returns a registry whose every preset is well-formed (all five components,
  correct types) and whose keys are exactly the starter names. Guards against a
  malformed shipped `presets.json`.
- **Validated-string (no closed union) confirmation:** a `loadPresets({ json })`
  with `agency:"some-future-axis-value"` LOADS without error (shape-valid) —
  proving the preset table does NOT reject unknown axis VALUES (existence is the
  resolver's job). Documents the deliberate validation split.
- **Memoization + reset:** `loadPresets()` twice returns a stable view;
  `resetPresetsForTesting()` then a fresh `loadPresets()` re-reads. (Light — just
  guards the test-isolation hook.)

## Risks

- **Starter-fragment alignment.** The starter `presets.json` must reference axis
  VALUES the sibling `fragment-loader` actually ships in its starter set;
  otherwise the resolver (not this feature) fails fast later. Mitigation: keep
  the starter presets to `base:"pi"` + the most generic axis values, and the
  implementor verifies against fragment-loader's landed starter set (both are
  no-dep foundations; whichever lands second checks the first). LOW — both ship
  in the same epic; misalignment surfaces immediately in the resolver tests.
- **Package `files` allowlist at publish.** `presets.json` (and `prompts/**`)
  must be in the published package or the `import.meta.url` read fails at runtime
  post-install. Same obligation the fragment-loader carries for `prompts/`.
  Mitigation: flag for the publish/packaging step; out of scope for this feature
  but noted. LOW for dev/test (files are present in-repo).
- **Duplicate-key detection is text-based.** Re-scanning raw text for repeated
  top-level keys is slightly heuristic vs a streaming parser. Mitigation: the
  file is tiny bundled data, keys are simple identifiers, and the validator is
  well-commented + directly tested. Acceptable. LOW.
- **Two structurally-identical types (`Preset`/`ResolvedMode`).** Minor
  duplication. Kept distinct deliberately: `Preset` is the on-disk template
  (could gain disk-only metadata later, e.g. a description); `ResolvedMode` is
  the runtime contract. Documented; not a `type Preset = ResolvedMode` alias so
  the two can diverge without a breaking rename. NEGLIGIBLE.

## Cross-model advisory

Skipped per the advisory policy (low-risk data/type feature). The one
potentially-material ambiguity — typed-union vs validated-string for axis values
— is resolved decisively by the epic's locked convention-discovery decision
(closed unions would drift from the discovered fragment set), so no real
architectural ambiguity remained to warrant a codex consult.

## Implementation notes

Landed as a single stride per the design body, no deviations.

**Files created:**

- `src/presets.ts` — exports `PI_BASE = "pi"`, the `ResolvedMode` and `Preset`
  interfaces (kept structurally distinct, not aliased, per the Risks note), the
  `PresetFile` / `PresetRegistry` / `LoadPresetsOptions` types, and the
  `loadPresets(opts?)` / `getPreset(name, registry)` / `resetPresetsForTesting()`
  surface. Disk read is package-relative via
  `fileURLToPath(new URL("../presets.json", import.meta.url))` + `readFileSync` +
  `JSON.parse` (consistent with the sibling fragment-loader, NOT a static JSON
  import). Module-scope memo of the disk-loaded registry with the `{ json }`
  test seam that parses fresh and never poisons the memo. Fail-fast validators:
  shape well-formedness (`validatePreset`), raw-text duplicate-id detection
  (`assertNoDuplicateIds`, run before `JSON.parse` collapses repeated keys), and
  unknown-preset lookup miss in `getPreset`. Axis-VALUE existence is deliberately
  NOT checked here (resolver's job) — only shape.
- `presets.json` — minimal starter: `default` (`base:"pi"`, no modifiers) and
  `flow` (`base:"pi"`, `agency:"autonomous"`, `modifiers:["flow"]`), both on
  `base:"pi"` per the starter-fragment-alignment risk (no base-overlay reference
  the starter set may lack).
- `tests/presets.test.ts` — 18 tests covering every case in the Testing section:
  lookup hit / atomic expansion / unknown-preset fail-fast (names miss + lists
  available) / duplicate-id fail-fast (raw-text seam, differing bodies prove
  last-wins isn't relied on) / malformed-shape (non-object top level, missing
  field, empty string, non-array modifiers, empty modifier entry, invalid JSON)
  / `PI_BASE` vs `NO_MODE_SIGNATURE` distinction / starter-set load-from-disk
  sanity / validated-string (unknown axis value loads) / memoization + reset +
  override-doesn't-poison-memo.

**Final `ResolvedMode` shape:** `{ base: string; agency: string; quality:
string; scope: string; modifiers: string[] }` — exactly as specified.

**Verification:**

- `npm run typecheck` (`tsc --noEmit`) — clean. (Used `typecheck`; there is no
  `build` script in package.json.)
- `npm test` — full suite green: 10 files, 134 tests pass (presets.test.ts
  contributes 18; the remaining growth above the prior 92 is the sibling
  fragment-loader's parallel tests).
