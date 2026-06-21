# Specification

The hard contract for pi-model-modes. Everything here is current truth and
is enforced — either by code, by tests, or both.

## Extension model

pi-model-modes is a pi extension package (`pi-package`), installed via
`pi install`. It registers:

- A `before_agent_start` handler that transforms pi's assembled system
  prompt per turn.
- A `/mode` command family for interactive mode selection.
- A keybinding that cycles modes.
- A config key for a session default mode.

No subprocess is spawned. No pi internals are monkey-patched. The plugin
operates entirely through the public `ExtensionAPI`.

## Integration point: `before_agent_start`

The handler signature, per pi's `ExtensionAPI`:

```ts
on(event: "before_agent_start",
   handler: (e: BeforeAgentStartEvent, ctx: ExtensionContext)
            => BeforeAgentStartEventResult)
```

- `e.systemPrompt` — pi's fully-assembled prompt (tools + guidelines +
  `<project_context>` + skills + date/cwd). The transform input.
- `e.systemPromptOptions` — structured `{ selectedTools, toolSnippets, cwd,
  skills, contextFiles, ... }`. Available for inspection; not normally
  needed since `e.systemPrompt` carries the finished text.
- `ctx.model` — the live model object `{ id, name, provider,
  contextWindow, reasoning, ... }`. Read fresh every turn.

The handler returns `{ systemPrompt: <transformed> }`. Pi assigns the
return value to `state.systemPrompt` for the upcoming turn.

## The three invariants

These are non-negotiable. Each has a test.

### 1. Clean-base handling (no double-append)

Pi calls the handler with `this._baseSystemPrompt` — a clean base, never
last turn's already-modified output. The handler therefore treats
`e.systemPrompt` as pristine on every call: identity and mode fragments are
spliced in exactly once per turn, sourced from `e.systemPrompt`, never from
any cached "previous output."

**Test:** across N consecutive turns with a mode set, the assembled prompt
contains exactly one identity line and exactly one copy of each selected
fragment.

### 2. Cache stability (byte-identical across no-change turns)

The assembled system prompt is byte-identical across consecutive turns in
which:

- (a) the model has not changed (`model.id` + `model.provider` stable), and
- (b) the mode has not changed (base + agency + quality + scope + modifiers
  stable), and
- (c) pi's own base has not changed (tools / skills / `<project_context>`
  / date / cwd stable).

**Test:** hash `ctx.getSystemPrompt()` across N no-change turns; assert
equality. Any drift fails the build.

Forbidden in assembled output, unconditionally:

- Timestamps, clocks, "as of" qualifiers.
- Turn counters, message counters, sequence numbers.
- Random IDs, UUIDs, nondeterministic values.
- Fragment ordering sourced from `Set` iteration or unordered object keys.

### 3. No-op when unset

With no mode selected (no `/mode`, no keybinding hit, no config default),
the handler prepends the identity line and injects NO mode fragments.
Baseline pi behavior is preserved for mode — no axis or modifier fragments,
same tools, same skills, same context, same caching. Identity is purely
additive: prepended as the first line, it never overrides or removes the
user's content, and applies even with a custom `SYSTEM.md` /
`--system-prompt`.

**Test:** with mode unset, the handler's return has the identity line as its
first byte and no mode fragments; the remainder is byte-identical to pi's
assembled base.

## Cache key and the change signal

To honor Invariant 2 efficiently, the handler computes a cache key every
turn and only re-assembles on a miss:

```
key = hash(
  model.id,
  model.provider,
  mode.signature,            // "base:chill|agency:autonomous|quality:architect|scope:adjacent|mod:flow"
  hash(e.systemPrompt)       // pi's base for this turn
)
```

- `key === lastKey` → return `lastResult` (no assembly work).
- `key !== lastKey` → assemble, store `lastResult` and `lastKey`, return.

The handler **always returns** a `systemPrompt`; it never returns
`undefined`, because pi interprets `undefined` as "revert to base" and
would drop identity + mode entirely.

The key diff is exposed internally as a change signal: downstream surfaces
(`/mode:inspect`, an optional status-line widget) read it to report *why*
the effective prompt last changed and *when*.

## Identity line

Derived from `ctx.model`:

```
You are {model.name} from {providerDisplayName(model.provider)}.
```

- `{model.name}` is the human-facing model name from the registry.
- Provider is rendered to a display name (e.g. `anthropic` → "Anthropic",
  `zai` → "Zhipu AI").
- Identity is **name + provider only** for v1. No context-window, no
  capability, no knowledge-cutoff text — those are signal-to-noise calls
  deferred to a future modifier.

The identity line is prepended to the spliced prompt as the very first
line. It is the most-stable element and therefore the longest-lived cached
prefix.

Identity is prepended on **every** turn — including mode-unset turns and
turns with a custom `SYSTEM.md` / `--system-prompt`. It is purely additive
and never overrides or removes the user's base content.

## Mode composition

A mode resolves to a fragment set:

```
mode = base + agency + quality + scope + {modifiers}
```

- **base** — one voice overlay (default: pi's own, i.e. no overlay).
- **agency** — one of `autonomous | collaborative | surgical | partner`.
- **quality** — one of `architect | pragmatic | minimal`.
- **scope** — one of `unrestricted | adjacent | narrow`.
- **modifiers** — zero or more of `bold, tdd, debug, flow, muse, readonly,
  methodical, director, speak-plain, context-pacing, playful`.

A **preset** is a named bundle: `{ base, agency, quality, scope,
modifiers[] }`. Selecting a preset selects all of its components atomically.

Assembly order within the splice is fixed and deterministic:

```
[identity line]
[base voice overlay]        // if a non-pi base is selected
[agency fragment]
[quality fragment]
[scope fragment]
[modifier fragments]        // in preset-declared order, or CLI order
... pi's assembled e.systemPrompt (tools / guidelines / context / skills / date / cwd) ...
```

Fragments are cached in module scope after first read; file I/O happens
once per fragment per process.

## Switching paths

Three paths converge on one resolver:

1. **`/mode <name|preset>`** — interactive command. Sets the active mode
   for the current session (ephemeral override over the config default).
   `/mode` with no argument shows the current mode and available presets.
   `/mode off` clears the override (falls back to config default or unset).
2. **Config default** — `mode` key in `~/.pi/agent/settings.json` or
   `.pi/settings.json`. Persists across sessions unless overridden.
3. **Keybinding** — cycles forward (and shifted, backward) through the
   preset list. Default binding is chosen at implementation time to avoid
   collisions (Ctrl+M is the candidate; verify against the user's
   keymap).

Resolution precedence: session override (`/mode`) > config default > unset.

Mode-state persistence model: config default is durable; the session
override is ephemeral (lives in module state, not written to disk). A new
session restarts from the config default.

## Out of scope for v1

- Capability metadata in the identity line (context window, reasoning
  support) — deferred to a possible future modifier.
- Full base-prompt replacement (`base/` here overlays; it does not
  overwrite pi's skeleton).
- Project-level auto-detection of mode from `AGENTS.md` or `.pi/mode`.
- Per-fragment customization UI — fragments are markdown files edited by
  hand.

## Open questions

- **`ctx.model` freshness under mid-session `/model`:** does the
  `before_agent_start` handler see the switched model on the immediately
  next turn, or one turn later? Resolved — identity is derived fresh each
  MISS off live `ctx.model`; the model-switch test in `tests/handler.test.ts`
  proves the line updates on the next MISS. The cache key includes
  `model.id`/`model.provider`, so a model switch forces a MISS and re-derive.
- **Default cycle keybinding:** Ctrl+M candidate; confirm no collision
  before shipping.
