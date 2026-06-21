---
id: epic-scaffold-handler-package-skeleton
kind: feature
stage: drafting
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

<!-- The design pass on this feature (`/agile-workflow:feature-design`) fills
in the exact manifest fields, tsconfig, factory signature/return, and the
narrow manifest-shape test. -->
