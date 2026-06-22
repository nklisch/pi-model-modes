---
id: epic-mode-composition-fragment-loader
kind: feature
stage: done
tags: [tests]
parent: epic-mode-composition
depends_on: []
release_binding: v0.2.0
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Fragment Loader — convention-directory discovery + stat-invalidated content cache

## Brief

This feature delivers `src/fragments.ts`: the module that discovers fragment
markdown files by directory convention and serves their trimmed content through
a module-scope cache. Axes (`axis/agency`, `axis/quality`, `axis/scope`) and
`modifiers/` are discovered by convention — dropping a `.md` in `axis/agency/`
makes it a selectable value with no code change — while `base/` keeps an ordered
`base.json` manifest because base slot order is load-bearing. Discovery yields
deterministic (filename-sorted) orderings so the downstream splice is
reproducible across turns.

The cache is **stat/mtime-based, not read-once**: it stores `{ mtime, content }`
per path and re-reads only when a file's mtime changes. This honors the epic's
locked decision that an edited fragment `.md` takes effect on the next turn
within the same session (no `/reload`/restart) while keeping I/O to a cheap stat
per access. Fragment root is resolved **package-relative** (never cwd-relative —
this is a pi package that runs in the user's working dir), with a test-only root
override so fixtures load deterministically.

This feature also ships the **minimal starter fragment set** (one file per type —
one base overlay, one fragment per axis, one modifier) sufficient to exercise the
engine and its tests. It does NOT author the ~40 real fragments (that is
`epic-fragment-library`), and it does NOT resolve modes or splice (those are
`mode-resolver` / `deterministic-splice`).

## Epic context

- Parent epic: `epic-mode-composition`
- Position in epic: **foundation — no deps; `mode-resolver` and the materialized
  ModePlan build on its content + ordering.** Parallelizes with `preset-table`.

## Foundation references

- `docs/SPEC.md` — "Mode composition" (fragment set + fixed splice order),
  "Cache stability" (deterministic ordering: no `Set` iteration / unordered keys).
- `docs/ARCHITECTURE.md` — "Fragment library" (`src/fragments.ts` reads each file
  once into a module-scope `Map`; base manifest vs convention discovery),
  "Components".

## Inherited / epic design decisions (do not re-litigate)

- **Hybrid discovery**: axes + modifiers by directory convention; `base/` via an
  ordered `base.json` manifest (slot order is load-bearing).
- **Stat/mtime invalidation** (resolved in the epic's codex advisory): the
  module cache keys content by path and re-reads on mtime change, so live edits
  apply next turn without `/reload` — the read-once promise is replaced by
  read-once-per-unchanged-mtime.
- **Package-relative fragment root** with a test override (not cwd-relative).
- **Deterministic ordering**: convention discovery returns filename-sorted
  results; the base manifest pins base order explicitly.
- **Validation fail-fast** (this feature's slice): a manifest entry pointing at a
  missing file, or an unreadable fragment dir, fails fast rather than silently
  yielding empty content.

## Design decisions

Resolved under autopilot delegation (scope `--all`). These EXTEND the inherited
locked decisions; they do not override them. Implementation tier: OPUS.

- **Cache entry shape**: `Map<string /*absolute path*/, { mtimeMs: number; content: string }>`.
  Key is the resolved absolute path (so two convention dirs can never collide on a
  bare filename). `mtimeMs` is `statSync(path).mtimeMs` (float ms; finer than
  whole-second `mtime` and already numeric — cheap `===` compare, no Date alloc).
  `content` is the **trimmed** file text. On `loadFragment(path)`: `statSync` →
  if a cache entry exists AND `entry.mtimeMs === stat.mtimeMs`, return
  `entry.content` (no read); else `readFileSync(path,"utf8").trim()`, store, return.
  — Mirrors `cache.ts` module-scope-state + reset idiom; numeric mtime compare is
  the cheapest correct invalidation signal.

- **What a "fragment ref" / "fragment id" is**: discovery does NOT invent a separate
  id type. It returns **absolute file paths** (`string`), filename-sorted within each
  group. The downstream resolver derives any human-facing value name (e.g. `autonomous`)
  from `basename(path, ".md")` when it needs one — the loader's contract is paths in,
  trimmed content out. Keeps this module a pure file layer with no naming policy.
  — SSOT: the filesystem is the registry; the path is the identity.

- **Empty axis dir vs missing axis dir**: **MISSING axis/modifiers dir → fail fast**
  (a required structural directory is absent → the starter set / package is broken,
  surface immediately). **EMPTY axis dir → fail fast too** (an axis with zero values
  is a broken package: the resolver could never satisfy "exactly one per axis").
  **EMPTY `modifiers/` dir → allowed** (zero modifiers is a valid library state).
  `discoverAxis` throws on missing-or-empty; `discoverModifiers` throws only on
  missing (empty returns `[]`). — Documented divergence: axes are mandatory-non-empty,
  modifiers are optional-non-empty.

- **Test-override mechanism**: a module-level settable root via
  `setFragmentRootForTesting(absRoot: string | undefined)` (pass `undefined` to
  restore the package-relative default), paired with `resetFragmentCacheForTesting()`
  which clears the content `Map` AND resets the root override. Discovery/load resolve
  the active root through one internal `fragmentRoot()` accessor (override ?? package
  default). — Mirrors `cache.ts`'s `resetCacheForTesting`; a module-settable root (not
  a threaded param) keeps every public signature clean and matches how the resolver
  will call these with no root argument.

- **Root resolution**: `fileURLToPath(new URL("../prompts/", import.meta.url))` from
  `src/fragments.ts` → `<package>/prompts/`. NEVER cwd-relative. Computed once at module
  load into a `const PACKAGE_ROOT`. — Locked by grounding facts (ESM, NodeNext).

- **`base.json` shape + location**: lives at `<root>/base.json`, schema
  `{ "overlays": string[] }` where each entry is a path **relative to `<root>`**
  (e.g. `"base/pi-overlay.md"`). Manifest order is the splice order. The default
  "pi's own base" is the *absence* of any non-pi base selection at resolve time — it
  is NOT an entry in `base.json` (an entry means a real overlay file must exist).
  — Matches ARCHITECTURE ("`base.json` manifest declares slot order"; default base is
  passthrough, no file).

- **Codex advisory: SKIPPED.** Per the cross-model advisory policy (small/low-risk
  skips it) and the delegating brief: this is a bounded single-module file layer; the
  one real architectural risk (package-relative root resolution under jiti) is already
  resolved in the grounding facts and the epic's codex pass. No residual 50/50
  irreversible choice remains. Host judgment resolved the cache-shape / id / empty-dir
  sub-decisions above.

## Architectural choice

**Options considered:**

1. **Eager load-all at module init** — walk every dir once at import, build the
   content `Map`, never touch disk again. *Optimizes* simplicity. *Sacrifices* the
   locked live-edit-next-turn promise (a `Map<path,string>` cannot observe edits) and
   pays full I/O even for fragments a session never selects. Rejected — violates the
   inherited stat/mtime decision.

2. **Lazy per-path stat-gated cache (CHOSEN)** — discovery returns sorted path lists
   (a `readdirSync` per axis/modifier group + a `base.json` parse); content is loaded
   lazily through `loadFragment(path)`, which stats on every access and re-reads only
   on mtime change. *Optimizes* correctness (honors live-edit), bounded I/O (cheap stat
   per access, read only on miss/change), and a clean path-in/content-out seam. *Sacrifices*
   one `statSync` syscall per fragment per turn — negligible at this scale (≤ ~15 files).
   Fits the epic's locked decisions exactly and mirrors `cache.ts`'s module-scope-state
   pattern.

3. **fs.watch-based invalidation** — register watchers, invalidate on change events.
   *Optimizes* zero stat-on-read. *Sacrifices* a lot: watcher lifecycle, platform
   flakiness, teardown in tests, and complexity far beyond a per-turn module loader.
   Rejected — over-engineered for a per-turn-cached file layer.

**Chosen: option 2.** It is the literal realization of the epic's locked stat/mtime
decision, keeps `src/fragments.ts` a pure file layer (paths + trimmed content, no
naming or selection policy), and reuses the established module-scope-state +
`resetForTesting` idiom from `cache.ts`.

## Implementation Units

This feature is **ONE cohesive stride** — see "Child story decision" below.
The single unit is the loader module; the starter fixtures and tests are part of
the same stride.

### Unit 1: Fragment loader module
**File**: `src/fragments.ts`

```ts
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

/**
 * Fragment loader — convention-directory discovery + stat/mtime-invalidated
 * module-scope content cache. Pure file layer: paths in, trimmed content out.
 * No naming, selection, or splice policy (that's resolver/assemble). Module-scope
 * mutable state is EXPECTED (the content cache IS stateful); reset for tests.
 *
 * Root is package-relative (<package>/prompts/), never cwd-relative — this runs
 * as a pi package loaded via jiti in the user's working dir. A test-only root
 * override loads fixtures deterministically.
 */

/** The three convention axes. Exactly one value per axis is selected downstream. */
export type Axis = "agency" | "quality" | "scope";
export const AXES: readonly Axis[] = ["agency", "quality", "scope"] as const;

/** Shape of <root>/base.json. `overlays` are paths relative to <root>; array
 *  order is the load-bearing base splice order. */
export interface BaseManifest {
  overlays: string[];
}

/** One cached file: numeric mtimeMs + trimmed content. */
interface CacheEntry {
  mtimeMs: number;
  content: string;
}

// --- Module-scope state (mutable by design) --------------------------------
const PACKAGE_ROOT = fileURLToPath(new URL("../prompts/", import.meta.url));
let rootOverride: string | undefined;
const contentCache = new Map<string, CacheEntry>();

function fragmentRoot(): string {
  return rootOverride ?? PACKAGE_ROOT;
}

// --- Discovery --------------------------------------------------------------

/**
 * Absolute paths of the `.md` files in one axis dir, filename-sorted ascending.
 * FAIL FAST: throws if the dir is missing OR empty (an axis must have ≥1 value).
 */
export function discoverAxis(axis: Axis): string[];

/**
 * Absolute paths of the `.md` files in `modifiers/`, filename-sorted ascending.
 * FAIL FAST: throws if the dir is MISSING. An EMPTY modifiers dir returns `[]`
 * (zero modifiers is a valid library state).
 */
export function discoverModifiers(): string[];

/**
 * Parse <root>/base.json and resolve each `overlays` entry to an absolute path,
 * preserving manifest order (load-bearing). FAIL FAST: throws if base.json is
 * missing/unparseable, if `overlays` is not a string[], or if any referenced
 * overlay file does not exist (orphaned manifest entry).
 */
export function discoverBaseOverlays(): string[];

// --- Content load -----------------------------------------------------------

/**
 * Trimmed content for an absolute fragment path, through the stat/mtime cache.
 * Stats the file every call; re-reads only when mtimeMs changed since the cached
 * entry. FAIL FAST: throws if the path cannot be stat'd/read (missing/unreadable).
 */
export function loadFragment(path: string): string;

// --- Test-only API (mirrors cache.ts resetForTesting idiom) -----------------

/** TEST-ONLY: override the fragment root (absolute). `undefined` restores the
 *  package-relative default. */
export function setFragmentRootForTesting(absRoot: string | undefined): void;

/** TEST-ONLY: clear the content cache AND reset the root override. */
export function resetFragmentCacheForTesting(): void;
```

**Implementation Notes**:
- `discoverAxis(axis)`: `dir = join(fragmentRoot(), "axis", axis)`. `readdirSync(dir,
  {withFileTypes:true})`, keep entries where `e.isFile() && e.name.endsWith(".md")`,
  map to `join(dir, e.name)`, `.sort()` (default lexicographic — deterministic).
  Wrap `readdirSync` so an ENOENT (missing dir) throws a clear
  `Fragment axis dir not found: <dir>`; after filtering, if length 0 throw
  `Fragment axis '<axis>' is empty: <dir>`.
- `discoverModifiers()`: `dir = join(fragmentRoot(), "modifiers")`. Same filter+sort.
  Missing dir → throw `Fragment modifiers dir not found: <dir>`. Empty → return `[]`.
  Distinguish missing from empty by catching the readdir ENOENT specifically (check
  `err.code === "ENOENT"`); any other readdir error rethrows as-is.
- `discoverBaseOverlays()`: read `join(fragmentRoot(),"base.json")` via `readFileSync`
  + `JSON.parse`. Validate `Array.isArray(parsed.overlays)` and every element is a
  string, else throw `Malformed base.json: 'overlays' must be a string[]`. For each
  entry resolve `join(fragmentRoot(), entry)` and `statSync` it — missing file throws
  `base.json references missing overlay: <abs> (entry "<entry>")`. Return the resolved
  abs paths **in manifest order** (do NOT sort — order is load-bearing).
- `loadFragment(path)`: `const st = statSync(path)` (throws on missing/unreadable —
  fail fast). `const hit = contentCache.get(path)`; if `hit && hit.mtimeMs === st.mtimeMs`
  return `hit.content`. Else `content = readFileSync(path,"utf8").trim()`,
  `contentCache.set(path, {mtimeMs: st.mtimeMs, content})`, return content. Trim happens
  ONCE per (re)read, then cached.
- All errors are plain `throw new Error(...)` with the offending absolute path — Fail
  Fast at the boundary, per principles. No silent empty-string fallbacks anywhere.
- Use `.js` import extensions if this module ever imports a sibling (none needed now).

**Acceptance Criteria**:
- [ ] `discoverAxis("agency")` returns absolute paths, filename-sorted ascending.
- [ ] `discoverAxis` throws on a missing axis dir and on an empty axis dir (distinct
      clear messages).
- [ ] `discoverModifiers()` returns `[]` for an empty `modifiers/`, throws if missing.
- [ ] `discoverBaseOverlays()` returns abs paths in `base.json` order (NOT re-sorted),
      throws on missing base.json, malformed `overlays`, or an orphaned entry.
- [ ] `loadFragment` returns trimmed content; second call without an edit does NOT
      re-read (mtime-cached); a content edit that bumps mtime triggers a re-read on the
      next call.
- [ ] `loadFragment` throws on a missing/unreadable path.
- [ ] Root override + reset work: fixtures load from the override; reset clears both
      the cache and the override.

---

### Unit 2: Minimal starter fragment set (shipped under `prompts/`)
**Files** (created by the implementor — minimal, real content sufficient to exercise
the engine and its tests; the ~40 real fragments are `epic-fragment-library`, NOT here):

- `prompts/base.json` — `{ "overlays": ["base/pi-direct.md"] }`
- `prompts/base/pi-direct.md` — one short voice-overlay paragraph (a real overlay so
  base-splice paths are exercised; default "pi's own" base remains the no-entry case).
- `prompts/axis/agency/autonomous.md` — one short behavioral brief (heading + a line).
- `prompts/axis/quality/pragmatic.md` — one short behavioral brief.
- `prompts/axis/scope/adjacent.md` — one short behavioral brief.
- `prompts/modifiers/tdd.md` — one short modifier brief.

Content guidance: each `.md` is a heading + 1-3 lines of plain prose (no dynamic text,
no timestamps — these feed the byte-stable splice). Pick value names that exist in the
SPEC's enumerations (`autonomous`, `pragmatic`, `adjacent`, `tdd`) so downstream
resolver fixtures align with real names. One file per axis satisfies the
"exactly one per axis" resolver contract against the starter set.

**Acceptance Criteria**:
- [ ] `prompts/` tree exists with exactly the files above; `base.json` parses and its
      one overlay entry resolves to an existing file.
- [ ] Each axis dir contains exactly one `.md`; `modifiers/` contains exactly one `.md`.
- [ ] Discovery over the real `prompts/` root (no override) returns the expected sorted
      paths and all load to non-empty trimmed content.

---

## Implementation Order

Single stride, but within it:
1. `src/fragments.ts` (Unit 1) — the loader module + test-override API.
2. `prompts/` starter set (Unit 2) — the fixtures the no-override sanity test needs.
3. `tests/fragments.test.ts` — discovery determinism, mtime invalidation, fail-fast,
   starter-set sanity (Unit 1 + Unit 2 must both exist).

## Testing

### Unit tests: `tests/fragments.test.ts`

Mirror `cache.test.ts` idioms: `beforeEach(resetFragmentCacheForTesting)`; build a
**fixture root** under a temp dir (`fs.mkdtempSync(os.tmpdir()+"/frag-")`), populate it,
`setFragmentRootForTesting(tmp)`, assert, then cleanup. Use the temp-fixture root for
every behavioral case; use the REAL package root (no override) only for the starter-set
sanity case.

Coverage:
- **Discovery determinism** — write `b.md, a.md, c.md` into a fixture axis dir; assert
  `discoverAxis` returns them sorted `a,b,c` as absolute paths. Re-run; assert identical
  array (no `Set`/unordered-key nondeterminism). `discoverBaseOverlays` returns entries
  in **manifest order**, NOT sorted (write a base.json whose order differs from sort
  order and assert order is preserved).
- **mtime invalidation triggers re-read** — `loadFragment` a fixture file, assert
  content; mutate the file AND bump its mtime (write new content, then
  `fs.utimesSync(path, future, future)` to guarantee a changed `mtimeMs` without relying
  on clock granularity); call `loadFragment` again, assert NEW content. Then call a
  third time with no further change and assert it does not re-read — verify by spying on
  `fs.readFileSync` (count calls) OR by writing content out-of-band without bumping
  mtime and asserting the OLD (cached) content is still returned. Prefer the
  out-of-band-write-without-mtime-bump assertion (no module mocking needed).
- **Missing-file / fail-fast** — `loadFragment("<tmp>/nope.md")` throws; `discoverAxis`
  on a missing dir throws; on an empty dir throws; `discoverModifiers` on a missing dir
  throws but on an empty dir returns `[]`; `discoverBaseOverlays` with an `overlays`
  entry pointing at a non-existent file throws (orphaned-manifest case); with a
  malformed `overlays` (e.g. `{"overlays":"x"}`) throws.
- **Starter-set sanity** (real root, no override) — `discoverAxis` for all three axes
  returns exactly one path each; `discoverModifiers` returns one; `discoverBaseOverlays`
  returns one; every discovered path `loadFragment`s to non-empty trimmed content; the
  value basenames are the expected starter names.
- **Reset isolation** — `setFragmentRootForTesting(x)` then `resetFragmentCacheForTesting()`
  restores the package default (a subsequent real-root discovery works) and empties the
  cache.

Test integrity: these tests assert real loader behavior against real temp files — no
`expect(true).toBe(true)`, no asserting on incidental return values. The mtime test
proves the invalidation contract, not just that a read happened.

## Risks

- **mtime granularity in the invalidation test (LOW, mitigated).** Whole-second `mtime`
  could mask a same-second edit. Mitigated two ways: the cache keys on float `mtimeMs`
  (sub-ms on most filesystems), and the test forces a distinct mtime via
  `fs.utimesSync(...future...)` rather than relying on wall-clock granularity. The
  "no-re-read when unchanged" half is proven by an out-of-band write WITHOUT an mtime
  bump (asserting the stale cached content), which needs no clock at all.
- **Package-root resolution under jiti (LOW, pre-resolved).** `import.meta.url` +
  `fileURLToPath(new URL("../prompts/", ...))` is confirmed correct for this ESM/NodeNext
  package by the grounding facts and the epic's codex pass. The test-override path means
  no behavioral test depends on the real root except the starter-set sanity case, which
  runs in-repo where the real `prompts/` exists.
- **Empty-vs-missing semantics drift (LOW).** Documented explicitly above (axes:
  mandatory-non-empty; modifiers: optional-non-empty) and pinned by dedicated fail-fast
  tests, so a future change to this policy will break a test rather than silently
  alter behavior.

## Child story decision

**NO child stories.** This is a single cohesive stride: one new module (`src/fragments.ts`),
one starter fixture tree (`prompts/`), and one test file (`tests/fragments.test.ts`).
Every test exercises the loader's code paths; the chunks are not meaningfully independent
(the starter set exists to satisfy the loader's sanity test; the tests need both the module
and the fixtures). There is no parallelism to exploit (one author, tight cohesion), no
cross-session resume surface, and the natural seams are file-vs-test, which is the package
boundary, not a story boundary. Per the skill's "stories are pure overhead" criteria — all
four conditions hold — the feature itself is the implementation unit. Implement directly
under the feature.

## Implementation notes

Landed as a single stride, exactly per the design body.

- **`src/fragments.ts`** (Unit 1): `Axis`/`AXES`, `BaseManifest`, the private
  `CacheEntry` shape, `PACKAGE_ROOT = fileURLToPath(new URL("../prompts/", import.meta.url))`,
  module-scope `rootOverride` + `contentCache` Map + `fragmentRoot()` accessor.
  A private `listMarkdown(dir)` helper does the `readdirSync({withFileTypes})` →
  filter `isFile() && .md` → `join` → `.sort()` shared by `discoverAxis` and
  `discoverModifiers`. Fail-fast wiring: `discoverAxis` throws "axis dir not found"
  on ENOENT and "is empty" after a zero-length filter; `discoverModifiers` throws
  "modifiers dir not found" on ENOENT but returns `[]` on empty (ENOENT distinguished
  via `err.code === "ENOENT"`). `discoverBaseOverlays` reads/parses `base.json`
  (distinct "not found" vs "unparseable" messages), validates `overlays` is a
  `string[]`, `statSync`-checks each resolved entry (throws "missing overlay"), and
  preserves manifest order (no sort). `loadFragment` does `statSync` → mtimeMs
  hit/miss → `readFileSync(...,"utf8").trim()`, caching the trimmed content.
  `setFragmentRootForTesting` / `resetFragmentCacheForTesting` mirror `cache.ts`.
  All errors are `throw new Error(...)` carrying the offending absolute path.
  (Deviation: dropped the unused `basename` import the skeleton listed — the loader
  has no naming policy and `noUnusedLocals` flags it; the resolver owns `basename`.)
- **`prompts/` starter set** (Unit 2): `base.json` = `{ "overlays": ["base/pi-direct.md"] }`,
  plus `base/pi-direct.md`, `axis/agency/autonomous.md`, `axis/quality/pragmatic.md`,
  `axis/scope/adjacent.md`, `modifiers/tdd.md` — each a heading + 1-3 lines of static
  prose (no dynamic text), SPEC value names exactly.
- **`tests/fragments.test.ts`**: 24 tests over a `mkdtempSync` temp fixture root via
  `setFragmentRootForTesting` (`beforeEach(resetFragmentCacheForTesting)`, temp cleanup
  in `afterEach`). Covers discovery determinism (sorted axes; base overlays in manifest
  order with a deliberately-unsorted manifest), the full mtime contract (re-read on a
  `utimesSync` bump; the no-re-read half proven by an out-of-band write WITH the mtime
  restored, asserting the stale cached value still surfaces — no module mocking), all
  fail-fast cases (missing/empty axis, missing modifiers throws + empty returns `[]`,
  orphaned/malformed/unparseable base.json, missing `loadFragment` path), reset
  isolation, and starter-set sanity against the REAL package root.

**Verification**: `npm run typecheck` clean; `npm test` green — full suite **116 tests**
(was 92; this feature adds 24 in `tests/fragments.test.ts`).

## Review record

**Verdict: Approve** — deep lane (feature), cross-model review via codex
(peeragent, 2 rounds: implementation review + confirmation), all findings
resolved.

Round 1 surfaced: (a) BLOCKER — the shipped starter `presets.json` (sibling
feature) referenced fragments this loader does not ship; resolved by making the
starter presets coherent with the shipped set. (b) `base.json` overlay entries
could escape the fragment root via `../` and `statSync` success did not prove a
file; fixed with path-containment + `isFile()` + ENOENT-specific messaging (other
I/O errors rethrown). Added `../`-escape and overlay-is-a-directory tests. The
mtime cache, missing-vs-empty axis semantics, manifest-order base overlays, and
package-relative root were confirmed correct. Symlink-escape nit rejected
(out of scope — package-authored data). 139 tests green, typecheck clean.
Advanced review → done.
