# Architecture

How pi-model-modes is put together and what happens each turn.

## Components

```
pi-model-modes/
├─ package.json              pi-package manifest: pi { extensions } + files allowlist
│                            (prompts/ is loaded by the plugin at runtime, package-relative)
├─ extensions/
│   └─ index.ts              default export: registers handler, /mode, keybinding, session_start
├─ src/
│   ├─ handler.ts            before_agent_start entry — orchestrates the transform
│   ├─ resolver.ts           mode resolution: two tiers (override > default), effective = override ?? default ?? unset
│   ├─ config.ts             plugin-owned config (pi-model-modes.json, global+project merge) → seeds the default tier
│   ├─ assemble.ts           identity derivation + fragment splice
│   ├─ cache.ts              cache key, lastKey/lastResult, change signal
│   ├─ fragments.ts          fragment loader (reads prompts/, caches in module scope)
│   ├─ presets.ts            preset table (name → {base, agency, quality, scope, mods})
│   ├─ provider-names.ts     provider id → display name map
│   ├─ commands.ts           /mode, /mode off, /mode:inspect
│   └─ keybinding.ts         cycle keybinding
├─ prompts/
│   ├─ base.json  overlay manifest (slot order) — at the prompts/ root
│   ├─ base/      voice overlays (chill.md, flow.md, pi-direct.md)
│   ├─ axis/
│   │   ├─ agency/   autonomous, collaborative, surgical, partner
│   │   ├─ quality/  architect, pragmatic, minimal
│   │   └─ scope/    unrestricted, adjacent, narrow
│   └─ modifiers/   bold, tdd, debug, flow, muse, readonly, methodical,
│                   director, speak-plain, context-pacing, playful
├─ presets.json              named bundles (e.g. "flow", "explore", "create")
└─ tests/
    ├─ cache.test.ts
    ├─ cache-stability.test.ts
    ├─ clean-base.test.ts
    ├─ commands.test.ts
    ├─ config.test.ts
    ├─ handler.test.ts
    ├─ identity.test.ts
    ├─ noop.test.ts
    ├─ registration.test.ts
    ├─ resolver.test.ts
    └─ resolver-tiers.test.ts
```

`extensions/index.ts` is the single registration surface. It wires the
handler, the command, the keybinding, and the `session_start` config-seed to
pi's `ExtensionAPI`. Everything else is plain modules with no pi coupling
except through typed interfaces — which keeps the logic unit-testable without
spinning up pi.

**Two-tier mode state.** `resolver.ts` holds the effective selection as two
distinct tiers: an ephemeral OVERRIDE (`/mode`, set via `setActiveMode` /
cleared via `clearActiveMode`) layered over a durable DEFAULT (config-seeded
via `setDefaultMode`). The per-turn resolve materializes `override ?? default`,
falling back to no-mode when both are unset; `getEffectiveModeSource()` reports
which tier won. `config.ts` reads the merged plugin config and seeds the
default tier at `session_start` (`applyDefaultFromConfig`), tolerating missing
or invalid config without crashing.

## Per-turn data flow

```
                ┌──────────────────────────────────────────────────┐
  user message  │  pi assembles _baseSystemPrompt                  │
 ──────────────▶│  (tools + guidelines + <project_context> +       │
                │   skills + date + cwd)                           │
                └──────────────────────┬───────────────────────────┘
                                       │
                                       ▼
                ┌──────────────────────────────────────────────────┐
                │  pi emits before_agent_start                     │
                │  e:  { systemPrompt, systemPromptOptions }       │
                │  ctx:{ model, getSystemPrompt(), ... }           │
                └──────────────────────┬───────────────────────────┘
                                       │
                                       ▼
                ┌──────────────────────────────────────────────────┐
                │  handler (src/handler.ts)                        │
                │                                                  │
                │  1. resolve active mode                          │
                │     override > config default > unset            │
                │  2. compute cache key                            │
                │     = hash(model.id, model.provider,             │
                │            mode.signature, hash(e.systemPrompt)) │
                │  3. key === lastKey ?  ─────── yes ──▶ return lastResult
                │  4. derive identity line from ctx.model          │
                │     (runs every MISS, regardless of mode)        │
                │  5. load fragments (module-scope cache)          │
                │  6. splice: identity + base + axes + modifiers   │
                │           + e.systemPrompt                       │
                │     (no mode → only [identity line] +            │
                │      e.systemPrompt; no base/axis/modifier        │
                │      fragments)                                  │
                │  7. store lastKey + lastResult; emit change sig  │
                │  8. return { systemPrompt }                      │
                └──────────────────────┬───────────────────────────┘
                                       │
                                       ▼
                ┌──────────────────────────────────────────────────┐
                │  pi assigns state.systemPrompt, runs the turn    │
                │  → provider prefix cache stays warm              │
                │    (stable bytes across no-change turns)         │
                └──────────────────────────────────────────────────┘
```

Steps 4–7 are the cache-miss path. On a hit, only steps 1–3 run — a hash
comparison and a return. Assembly is skipped entirely, which is what makes
the per-turn cost negligible.

## Fragment library

Fragments are plain markdown, one concern each. Three layers mirror the
composition model:

- **base/** — voice overlays, not skeletons. They do not restate pi's
  tools/context; they shift register and emphasis. A `base.json` manifest
  declares the slot order so the overlay's position in the splice is fixed.
  The default base is *pi's own* — no file, passthrough.
- **axis/{agency,quality,scope}/** — one file per value. Each is a short
  behavioral brief (a heading, a paragraph, a bullet list). Exactly one
  file per axis is selected.
- **modifiers/** — one file per modifier, zero or more selected, applied
  in the order the preset or command declares.

`src/fragments.ts` caches trimmed content in a module-scope
`Map<path, { mtimeMs, content }>` and re-reads a file only when its `mtimeMs`
changes (a cheap `statSync` per access; a full read only on a miss or an edit).
So editing a fragment `.md` takes effect on the next turn within the same
session — no `/reload` or restart. This is independent of the per-turn cache
key, but a content edit changes the mode signature (which hashes fragment
content), so the next turn re-assembles.

## Cache and change signal (`src/cache.ts`)

Two caches, distinct in purpose:

| Cache | Scope | Key | Invalidation |
|-------|-------|-----|--------------|
| **Per-turn result cache** | one entry | `hash(model, mode, piBase)` | any input changes |
| **Fragment file cache** | one entry per file | file path | stat/mtime — a fragment edit re-reads on the next turn |

The per-turn cache is the one that enforces SPEC Invariant 2. Its existence
makes the change-detection signal free: whenever `lastKey` is replaced, the
plugin records `{ previousKey, newKey, turn, reason }` in a small ring
buffer. `/mode:inspect` reads that buffer to render:

```
Mode: flow  (base:chill • agency:autonomous • scope:adjacent • +flow)
Identity: You are GLM-4.6 from Zhipu AI.
Effective prompt last changed: 3 turns ago — reason: model switched
                                         (zai/glm-4.5 → zai/glm-4.6)
Cache key: 9f3a...c1e2
```

## Where each invariant is enforced

| Invariant (SPEC) | Enforced in | How |
|------------------|-------------|-----|
| Clean-base handling | `assemble.ts` | the MISS splice always sources from `e.systemPrompt`, never from `lastResult` |
| Cache stability | `assemble.ts` + `cache.ts` | no dynamic text; ordered concatenation only; key covers all inputs |
| No-op when unset | `handler.ts` | identity always prepended; mode-unset injects NO mode fragments (identity still injects) |

## Key design properties

- **Identity leads the prompt.** The model's name+provider is the first
  byte the model reads. It is also the most stable element, so it anchors
  the longest possible cached prefix.
- **Mode fragments sit between identity and pi's content.** They are
  stable per mode, so they extend the cached prefix without breaking it.
  Pi's assembled content (tools/context/date) trails — if pi's tail drifts
  (e.g. midnight date rollover), only the tail's cache invalidates; the
  head stays warm.
- **The cache key is the only thing that decides work.** Switching models
  or modes is the only thing that forces a re-assemble. Everything else
  is a hit.
- **The plugin never rewrites message history.** All per-turn transformation
  happens inside the system prompt; the plugin never mutates or rewrites
  existing conversation entries. The one additive exception is the
  user-invoked `/mode:inspect`, which emits a single `display:true` status
  message (so the inspect panel may appear in later context — an accepted v1
  tradeoff, see `epic-identity-injection-mode-inspect`). Ordinary turns add
  nothing to conversation cost or context growth.
