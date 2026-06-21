---
id: epic-scaffold-handler-package-skeleton
kind: feature
stage: implementing
tags: [tests]
parent: epic-scaffold-handler
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Package Skeleton (loadable pi-package)

## Brief

This feature stands up the bare pi-package skeleton that pi can discover and
load: the `package.json` with its `pi` manifest, the TypeScript configuration,
the `extensions/index.ts` default-export factory, and the peer-dependency
declarations. Nothing here transforms the prompt yet — the factory is a shell
that proves pi invokes our extension and hands us the `ExtensionAPI`. The
deliverable is "pi discovers the package, loads the extension, and calls our
factory without error."

It is the foundation feature for the whole epic (and, transitively, for every
sibling epic — none of them can register handlers, commands, or keybindings
until this skeleton loads). The sibling feature `epic-scaffold-handler-noop-handler`
consumes this factory to register the actual `before_agent_start` handler, so
this feature owns the shape of the entry point and the type surface others
import from.

This feature does NOT cover: the handler itself, prompt transformation, any
invariant test, the test harness for invoking the handler. Those belong to the
sibling feature. The skeleton's own test surface is narrow: assert the manifest
shape (pi key, keywords, peer deps), the tsconfig, and that the default export
is a callable factory.

## Epic context

- Parent epic: `epic-scaffold-handler`
- Position in epic: **foundation feature** — produces the loadable package,
  the entry-point factory signature, and the `@earendil-works/pi-coding-agent`
  + `typebox` peer-dep type surface. The sibling no-op-handler feature depends
  on this landing first.

## Foundation references

- `docs/SPEC.md` — "Extension model" (pi-package, no subprocess, public
  `ExtensionAPI` only), "Integration point: `before_agent_start`" (the
  handler signature this skeleton will host).
- `docs/ARCHITECTURE.md` — "Components" (`package.json`, `extensions/index.ts`
  as the single registration surface), "Key design properties" (plain modules,
  no pi coupling except through typed interfaces).
- `docs/VISION.md` — "What this is not" (pure in-process extension, no
  wrapper binary).

## Inherited design decisions (from parent epic)

These are locked in the epic's `## Design decisions`; this feature inherits
them and must not re-litigate:

- **Language/build**: TypeScript source, no compile/build step — pi loads `.ts`
  via `jiti` on the fly.
- **Runtime**: `engines.node >= 22.19.0` (pi's floor).
- **Test framework**: `vitest` (`vitest --run`).
- **Imports**: `@earendil-works/pi-coding-agent` and `typebox` are
  `peerDependencies: {"*": "*"}` and must NOT be bundled.
- **pi discovery constraints** (shape to scaffold — feature-design fills in
  exact paths): a `package.json` with a `pi` manifest key pointing at the
  extensions entry (e.g. `{ "extensions": ["./extensions/index.ts"] }`),
  `keywords: ["pi-package"]`, and the default export of
  `extensions/index.ts` is the factory `function(pi: ExtensionAPI) { ... }`.

## Design

Grounded in pi's installed docs
(`/home/nathan/.local/share/mise/installs/node/24.17.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md`
and `docs/extensions.md`) and the parent epic's locked decisions. **No
contradictions found** — every locked decision matches pi's documented
behavior (verified below in "Verification against pi docs").

### Directory layout

First files in a greenfield repo. Establishes the skeleton the rest of the
project fills in, per `docs/ARCHITECTURE.md` "Components":

```
pi-model-modes/                 (repo root == package root)
├─ package.json                 pi-package manifest + npm metadata
├─ tsconfig.json                strict ESM, NodeNext, noEmit (jiti transpiles)
├─ vitest.config.ts             node env, globals, test include pattern
├─ README.md                    minimal package stub
├─ .gitignore                   Node/TS artifacts (none existed before)
├─ extensions/
│   └─ index.ts                 default-export factory shell (NO handler yet)
├─ src/                         (later epics: handler, resolver, assemble, …)
├─ prompts/                     (later epic: fragment library)
└─ tests/                       (sibling feature adds the invariant tests)
```

`src/`, `prompts/`, and `tests/` are **not created by this feature** — they
appear in later epics. `tsconfig.json`'s `include` lists them anyway so
sibling features' files are type-checked without editing tsconfig each time.

### Contract: `package.json`

```jsonc
{
  "name": "pi-model-modes",
  "version": "0.0.0",
  "description": "A pi extension that adapts the system prompt per model/mode.",
  "type": "module",
  "keywords": ["pi-package"],
  "engines": { "node": ">=22.19.0" },
  "pi": {
    "extensions": ["./extensions/index.ts"]
  },
  "scripts": {
    "test": "vitest --run",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "typebox": "*"
  },
  "devDependencies": {
    "@types/node": "^22.19.0",
    "typescript": "^6.0.0",
    "vitest": "^4.0.0"
  }
}
```

Key decisions:

- **`type: "module"`** — the factory and all later `src/` modules use ESM
  `import`/`export`; NodeNext module resolution requires this.
- **`keywords: ["pi-package"]`** — required by pi for package discoverability
  (packages.md "Creating a Pi Package": "Include the `pi-package` keyword for
  discoverability").
- **`pi.extensions: ["./extensions/index.ts"]`** — explicit file, not the
  directory `./extensions`. Rationale: pi's convention-directory mode loads
  *every* `.ts` under `extensions/` as a separate extension entry. Pointing
  at the explicit file is the robust contract so future sibling modules
  inside `extensions/` are not accidentally treated as extension entries.
  Matches the brief's example and pi's own "Package with dependencies"
  example (`"extensions": ["./src/index.ts"]`). Only `extensions` is declared
  now — `prompts`/`skills`/`themes` are added by later epics when those dirs
  exist; declaring empty/absent dirs now would be noise.
- **`peerDependencies`** — exactly the two packages this skeleton's type
  surface imports (`ExtensionAPI` from `@earendil-works/pi-coding-agent`;
  `typebox` will be imported by the sibling handler). Both at `"*"` and NOT
  in `bundledDependencies`, per packages.md "Dependencies": these are the pi
  core packages pi bundles itself; listing them as peers prevents npm from
  fetching a duplicate copy that would not share pi's module instance.
- **No `dependencies`** — the skeleton has no runtime deps. (Later fragment
  loading uses only Node builtins.)
- **`engines.node: ">=22.19.0"`** — matches pi's own `engines` exactly
  (verified: pi's installed package.json declares `engines.node` `">=22.19.0"`).
- **`version: "0.0.0"`** — honest pre-release; nothing is wired yet.
- **devDep versions** are caret floors on current latest (verified via
  `npm view`: vitest 4.1.9, typescript 6.0.3, @types/node 26.0.0). The
  implementor runs `npm install` to resolve and commits the resulting
  `package-lock.json`. **`@types/node` is pinned to `^22.19.0` (the Node
  engine floor), not latest 26**, so the type surface cannot expose Node
  APIs newer than what the package's own `engines` promises to run on.

### Contract: `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUnusedParameters": true,
    "noUnusedLocals": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node", "vitest/globals"],
    "noEmit": true
  },
  "include": [
    "extensions/**/*.ts",
    "src/**/*.ts",
    "tests/**/*.ts",
    "vitest.config.ts"
  ]
}
```

Key decisions:

- **`noEmit: true`** — there is no build step; jiti transpiles on the fly.
  tsconfig exists purely for editor support and `tsc --noEmit` type-checking.
- **`module`/`moduleResolution: "NodeNext"`** + **`type: "module"`** in
  package.json — coherent ESM Node layout. Required for correct
  `.ts`/`node:*` import resolution.
- **`target`/`lib: "ES2023"`** — Node 22.19 supports ES2023 fully; no DOM lib
  (this is a pure Node extension).
- **`strict: true`** plus `noUnusedParameters`/`noUnusedLocals` — enforces the
  empty factory body must name its unused param `_pi` (TS convention).
- **`verbatimModuleSyntax: true`** — forces type-only imports to be written
  `import type`; the factory's only import (`ExtensionAPI`) is type-only, so
  this is compatible and good hygiene under jiti/esbuild per-file transpile
  (pairs with `isolatedModules`).
- **`types: ["node", "vitest/globals"]`** — `node` for Node globals + `node:*`
  ambient declarations, `vitest/globals` so the sibling feature's tests can
  use `describe`/`it`/`expect` as globals. Listing `types` *restricts*
  automatic `@types/*` inclusion to exactly these, which is why `node` must
  be explicit (otherwise `@types/node`'s globals would be dropped).

### Contract: `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
  },
});
```

Key decisions:

- **`globals: true`** + `tsconfig.types: ["vitest/globals"]` — coherent
  globals style for the sibling feature's tests.
- **`include: ["tests/**/*.test.ts"]`** — pins the test location so stray
  files under `src/`/`extensions/` are never swept up as tests.
- **`passWithNoTests: true`** — this feature ships **zero test files** (per
  autopilot directive: no tests in this feature — the handler/manifest tests
  belong to the sibling `noop-handler` feature). With the flag, `npm test`
  (`vitest --run`) exits 0 with no matching tests, satisfying acceptance
  criterion (d). **Note to the sibling feature:** once real tests exist this
  flag is moot (it only triggers when literally zero tests match), but
  consider dropping it then so a future discovery regression does not
  silently green-light an empty suite.

### Contract: `extensions/index.ts` (factory shell)

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * pi extension entry. The default export is the factory pi discovers and
 * calls via jiti. It receives the public ExtensionAPI.
 *
 * This skeleton deliberately registers NOTHING. The `before_agent_start`
 * handler is registered in the sibling feature
 * `epic-scaffold-handler-noop-handler`, which edits this file (extends the
 * body — does not overwrite it).
 *
 * Contract this feature guarantees and downstream features rely on:
 *   - default export is a function (sync or async) taking ExtensionAPI
 *   - loading the module has no side effects beyond defining the factory
 *   - the param is named `_pi` only because it is unused in the shell;
 *     the sibling feature renames it to `pi` when it starts using it.
 */
export default function (_pi: ExtensionAPI) {
  // handler registered in the noop-handler feature
}
```

Key decisions:

- **Factory signature `function (pi: ExtensionAPI)`** — exactly the shape pi
  documents (extensions.md "Writing an Extension": "exports a default factory
  function that receives `ExtensionAPI`. The factory can be synchronous or
  asynchronous"). The skeleton uses the sync form; the sibling feature keeps
  it sync (the no-op handler is `async`, but the *factory* stays sync — the
  handler async-ness is internal to the `pi.on(...)` callback).
- **Param named `_pi`** — satisfies `noUnusedParameters`; the `_` prefix is
  the TS convention for an intentionally-unused parameter. The sibling
  feature renames to `pi` when it wires the handler.
- **Body is empty** — guarantees acceptance criterion (c): no handler, no
  command, no keybinding, no tool, no event subscription is registered. The
  only thing this feature proves is that pi imports the module and calls the
  factory without error.
- **No `pi.on(...)`, no `pi.registerTool(...)`, no `pi.registerCommand(...)`** —
  explicitly absent. Any of those is out of scope and belongs downstream.
- **Type-only import** — `import type { ExtensionAPI }` so the runtime import
  graph has zero pi symbols (compatible with `verbatimModuleSyntax`).

### Contract: `.gitignore` (new — none existed before)

Standard Node/TS artifacts; does not touch the unrelated untracked junk
already in the working tree (`aws/`, `awscliv2.zip`,
`google-cloud-cli-linux-x86_64.tar.gz`) — those are out of scope for this
feature:

```
node_modules/
*.tsbuildinfo
dist/
build/
coverage/
*.lcov
*.log
npm-debug.log*
.env
.env.*
!.env.example
.DS_Store
```

### Contract: `README.md` (minimal stub)

One-paragraph description, a `## Development` section (`npm install`,
`npm test`, Node >= 22.19.0), and a note that pi loads it via the `pi`
manifest (`extensions/index.ts`). Marked "Status: scaffold — loads but
registers no handler yet." so the project's state is self-documenting.

### Verification against pi docs (no contradictions)

| Locked decision (epic) | pi docs say | Match |
|---|---|---|
| TS source, no build, via jiti | "Extensions are loaded via jiti, so TypeScript works without compilation." (extensions.md) | yes |
| Node >= 22.19.0 | pi's own `package.json` `engines.node`: `">=22.19.0"` | yes |
| vitest | (project choice; not contradicted) | yes |
| `pi-coding-agent` + `typebox` as `peerDependencies: "*"`, not bundled | "If you import any of these, list them in `peerDependencies` with a `'*'` range and do not bundle them: … `@earendil-works/pi-coding-agent`, … `typebox`." (packages.md "Dependencies") | yes |
| `keywords: ["pi-package"]` | "Include the `pi-package` keyword for discoverability." (packages.md) | yes |
| factory `function(pi: ExtensionAPI)` | "exports a default factory function that receives `ExtensionAPI`. … can be synchronous or asynchronous." (extensions.md) | yes |

### Deferred / out of scope (logged so the implementor does not re-litigate)

- **No test files.** The brief's "narrow test surface (manifest shape, tsconfig,
  default export callable)" is deferred to the sibling `noop-handler` feature:
  that feature imports the factory to test the handler, so it can assert
  manifest shape + factory-callability in the same harness without a one-off
  test in this feature that the sibling would have to coordinate with. The
  `passWithNoTests` config + the `typecheck` script cover this feature's
  automated verification (manifest is well-formed JSON, factory type-checks).
- **No handler/command/keybinding/tool registration.** Sibling feature's job.
- **No `src/`, `prompts/`, or `tests/` dirs created.** Later epics.
- **`@types/node` pinned to the engine floor** (`^22.19.0`), not latest, so
  the type surface cannot drift ahead of the supported runtime.

## Acceptance criteria

Reviewer verifies against the public surface, not the implementation:

1. **pi-discoverable.** `package.json` has `keywords: ["pi-package"]` and a
   `pi` manifest with `extensions: ["./extensions/index.ts"]` pointing at a
   file that exists. `pi install <abs-path-to-repo>` (or `-e`) succeeds and
   `pi list` shows `pi-model-modes`.
2. **Factory loads.** When pi imports the extension, the default export is
   called with an `ExtensionAPI` and returns without throwing. (Manual proof:
   run `pi -e ./extensions/index.ts` in a throwaway session; pi starts, no
   load error. The sibling feature later adds an automated version of this.)
3. **No handler registered.** The factory body contains no `pi.on(...)`,
   `pi.registerTool(...)`, `pi.registerCommand(...)`, `pi.registerShortcut(...)`,
   or `pi.registerFlag(...)` call. Confirmed by reading `extensions/index.ts`.
4. **`npm test` is green with zero tests.** `npm install` then `npm test`
   exits 0 (vitest reports "no test files found" but `passWithNoTests` keeps
   the exit code 0). No placeholder test is shipped.
5. **`npm run typecheck` is green.** `tsc --noEmit` exits 0 against
   `tsconfig.json` (strict, NodeNext, vitest/globals types resolve).
6. **Peer deps correct.** `peerDependencies` lists exactly
   `@earendil-works/pi-coding-agent` and `typebox`, both `"*"`, and neither
   appears in `dependencies` or `bundledDependencies`.
7. **Manifest is the only pi-coupling.** No file other than
   `extensions/index.ts` imports from `@earendil-works/pi-coding-agent` or
   `typebox` (there are no other source files yet, so this is trivially
   true — the point is to keep it that way until later epics).

## Implementation units

Six files, all new (greenfield). Order is dependency-free; create in any
order, then `npm install` and run `npm test` + `npm run typecheck`.

1. **`package.json`** — manifest + metadata per the contract above.
2. **`tsconfig.json`** — strict ESM/NodeNext/noEmit config per the contract.
3. **`vitest.config.ts`** — node env, globals, include, `passWithNoTests`.
4. **`extensions/index.ts`** — the default-export factory shell (empty body,
   `_pi` param, type-only `ExtensionAPI` import). **This file is co-owned
   with the sibling `noop-handler` feature** — that feature edits the body
   (adds `pi.on("before_agent_start", …)`), it does not replace the file or
   the export shape.
5. **`.gitignore`** — Node/TS artifacts (first `.gitignore` in the repo).
6. **`README.md`** — minimal package stub.

After creating the files: `npm install` (resolves + writes
`package-lock.json`, which is committed), then verify criteria 4 and 5
(`npm test`, `npm run typecheck`). Criterion 1–3 are structural and
confirmed by inspection / a one-off `pi -e ./extensions/index.ts` smoke run.

**No `depends_on` added** — this feature has none (cycle-check: clean).
