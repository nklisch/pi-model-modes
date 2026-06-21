# Architecture

How pi-model-modes is put together and what happens each turn.

## Components

```
pi-model-modes/
├─ package.json              pi-package manifest: pi { extensions, prompts }
├─ extensions/
│   └─ index.ts              default export: registers handler, /mode, keybinding
├─ src/
│   ├─ handler.ts            before_agent_start entry — orchestrates the transform
│   ├─ resolver.ts           mode resolution: override > config default > unset
│   ├─ assemble.ts           identity derivation + fragment splice
│   ├─ cache.ts              cache key, lastKey/lastResult, change signal
│   ├─ fragments.ts          fragment loader (reads prompts/, caches in module scope)
│   ├─ presets.ts            preset table (name → {base, agency, quality, scope, mods})
│   ├─ provider-names.ts     provider id → display name map
│   ├─ commands.ts           /mode, /mode off, /mode:inspect
│   └─ keybinding.ts         cycle keybinding
├─ prompts/
│   ├─ base/      base.json (slot order) + voice overlays (chill.md, flow.md)
│   ├─ axis/
│   │   ├─ agency/   autonomous, collaborative, surgical, partner
│   │   ├─ quality/  architect, pragmatic, minimal
│   │   └─ scope/    unrestricted, adjacent, narrow
│   └─ modifiers/   bold, tdd, debug, flow, muse, readonly, methodical,
│                   director, speak-plain, context-pacing, playful
├─ presets.json              named bundles (e.g. "flow", "explore", "create")
└─ tests/
    ├─ cache.test.ts
    ├─ cache-stability.test.ts   (downstream, not yet present)
    ├─ clean-base.test.ts
    ├─ handler.test.ts
    ├─ identity.test.ts
    ├─ noop.test.ts
    └─ registration.test.ts
```

`extensions/index.ts` is the single registration surface. It wires the
handler, the command, and the keybinding to pi's `ExtensionAPI`. Everything
else is plain modules with no pi coupling except through typed interfaces —
which keeps the logic unit-testable without spinning up pi.

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

`src/fragments.ts` reads each file once, caches the trimmed content in a
module-scope `Map<path, string>`, and returns cache hits without touching
disk. This is independent of the per-turn cache key — it survives mode
switches.

## Cache and change signal (`src/cache.ts`)

Two caches, distinct in purpose:

| Cache | Scope | Key | Invalidation |
|-------|-------|-----|--------------|
| **Per-turn result cache** | one entry | `hash(model, mode, piBase)` | any input changes |
| **Fragment file cache** | one entry per file | file path | process restart (or `/reload`) |

The per-turn cache is the one that enforces SPEC Invariant 2. Its existence
makes the change-detection signal free: whenever `lastKey` is replaced, the
plugin records `{ previousKey, newKey, turn, reason }` in a small ring
buffer. `/mode:inspect` reads that buffer to render:

```
Mode: flow  (base:chill • agency:autonomous • scope:adjacent • +flow)
Identity: GLM-4.6 (Zhipu AI)
Effective prompt last changed: 3 turns ago — reason: model switched
                                         (zai/glm-4.5 → zai/glm-4.6)
Cache key: 9f3a...c1e2
```

## Where each invariant is enforced

| Invariant (SPEC) | Enforced in | How |
|------------------|-------------|-----|
| Clean-base handling | `handler.ts` | the MISS splice always sources from `e.systemPrompt`, never from `lastResult` (no `assemble.ts` yet — `epic-mode-composition` introduces it with mode fragments and this row rolls forward to it then) |
| Cache stability | `handler.ts` + `cache.ts` | no dynamic text; ordered concatenation only; key covers all inputs |
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
- **The plugin never touches message history.** All transformation happens
  inside the system prompt. Conversation cost and context-growth behavior
  are pi's; this plugin adds nothing to them.
