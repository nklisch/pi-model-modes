# pi-model-modes

A [pi](https://pi.dev) extension that adapts the system prompt per model and per
behavioral **mode**.

Every turn it tells the model what it is — `You are {model.name} from {provider}.`
— read live from `ctx.model`, and (when a mode is selected) splices a composable
mode into pi's assembled system prompt. It **transforms** pi's prompt rather than
replacing it: tools, skills, `<project_context>`, and date/cwd all survive. With
no mode selected, only the identity line is added.

The assembled prompt is byte-stable across turns where nothing relevant changed
(a per-turn cache key over model + mode signature + pi's base keeps provider
prefix caches warm).

## Install

This is a pi package (`pi-package` keyword + `pi` manifest in `package.json`,
entry at `extensions/index.ts`).

```bash
# from a local clone — edits hot-reload via /reload during development
pi install /absolute/path/to/pi-model-modes

# …or try it for the current run only, without writing to settings
pi -e /absolute/path/to/pi-model-modes
```

`pi install` writes the package into your `settings.json` `packages` list; the
extension is then auto-loaded on every session.

## Using modes

A **mode** composes one **base** voice + one value from each of three axes
(**agency** × **quality** × **scope**) + zero or more **modifiers**. A **preset**
is a named bundle of those choices, applied atomically.

### Commands

| Command | Effect |
|---|---|
| `/mode` | Show the effective mode (its source tier + composed axes) and the available presets. Display-only — triggers no turn. |
| `/mode <preset>` | Set the mode for this session (an ephemeral override). Unknown presets surface an error and leave the prior mode intact. |
| `/mode off` | Clear the session override; falls back to the config default (or unset). |

`/mode:inspect` shows the effective mode, the derived identity line, when/why the
prompt last changed, and the current cache key — useful for debugging cache
behavior or a stuck mode.

### Keybindings

No mode-cycle shortcut is registered by default. Mode changes are made with
`/mode`; this avoids terminal control-character collisions such as `Ctrl+M`,
which is encoded like Enter in legacy terminal input.

### Config default

A durable default mode can be set in a plugin-owned config file (separate from
pi's closed `settings.json`, which has no plugin namespace). Two files are read
and shallow-merged, **project over global**:

- global:  `~/.pi/agent/pi-model-modes.json`
- project: `<cwd>/.pi/pi-model-modes.json`

Shape (v1):

```json
{ "defaultMode": "flow" }
```

An invalid `defaultMode` (unknown preset / missing fragment) warns and is
skipped — it never crashes the session.

**Precedence:** session override (`/mode`) > config default > unset.
The override is ephemeral (in-memory, not written to disk): a genuinely new
session (`/new`, `/resume`, `/fork`) restarts from the config default, while a
same-session `/reload` or `startup` keeps any active override.

## Mode reference

**Base** voice (default `pi` = no overlay, identity only):

- `pi` — no voice overlay
- `chill`, `flow`, `pi-direct` — overlay voices (`prompts/base/*.md`)

**Agency** — `autonomous` · `collaborative` · `surgical` · `partner`

**Quality** — `architect` · `pragmatic` · `minimal`

**Scope** — `unrestricted` · `adjacent` · `narrow`

**Modifiers** (zero or more) — `bold` · `tdd` · `debug` · `flow` · `muse` ·
`readonly` · `methodical` · `director` · `speak-plain` · `context-pacing` ·
`playful`

### Built-in presets

| Preset | base | agency | quality | scope | modifiers |
|---|---|---|---|---|---|
| `create` | pi | autonomous | architect | unrestricted | — |
| `extend` | pi | autonomous | pragmatic | adjacent | — |
| `safe` | pi | collaborative | minimal | narrow | — |
| `refactor` | pi | autonomous | pragmatic | unrestricted | — |
| `explore` | pi | collaborative | architect | narrow | readonly |
| `debug` | chill | collaborative | pragmatic | narrow | debug |
| `methodical` | chill | surgical | architect | narrow | methodical |
| `director` | chill | collaborative | architect | unrestricted | director |
| `partner` | chill | partner | pragmatic | adjacent | speak-plain, tdd |
| `muse` | chill | autonomous | architect | unrestricted | muse |
| `flow` | flow | autonomous | architect | adjacent | flow |
| `tinker` | flow | autonomous | pragmatic | unrestricted | flow, playful |
| `spark` | chill | autonomous | architect | unrestricted | muse, playful |
| `none` | — | — | — | — | virtual no-mode override |

Preset definitions live in [`presets.json`](presets.json), except `none`, which
is virtual and injects no mode fragments. The fragment text lives in
[`prompts/`](prompts) (`base/`, `axis/{agency,quality,scope}/`, `modifiers/`).
Fragment files are cached by mtime, so editing one takes effect on the next turn
— no `/reload` needed.

## How it works

- **Identity is additive.** `You are {model.name} from {provider}.` is prepended
  as the very first line on every turn — including mode-unset turns and turns
  with a custom `SYSTEM.md` / `--system-prompt`. It never overrides or removes
  the user's base content.
- **Assembly is deterministic.** Within the splice, order is fixed: identity →
  base voice → agency → quality → scope → modifiers (in preset-declared order) →
  pi's assembled base.
- **Cache-stable.** The handler computes a cache key each turn over
  `model.id` + `model.provider` + the mode signature + a hash of pi's base, and
  only re-assembles on a miss. There are no timestamps, counters, or
  nondeterministic values in the assembled output, so consecutive no-change
  turns produce byte-identical prompts.
- **No-op when unset.** With no mode selected, only the identity line is
  prepended; no axis or modifier fragments are injected.
- **Modes are advisory for spawned subagents.** Mode fragments splice into the
  *main session's* system prompt. When you spawn a subagent (e.g. via pi's
  `subagent` tool), the agent's own definition file (its `*.md` under
  `~/.pi/agent/agents/`) is appended *after* the mode fragments, so on any
  conflict the agent's hardcoded posture wins. Selecting `/mode surgical` will
  not, for example, override the `implementor` agent's designed refactor scope —
  modes retune the conversation you're in, not the specialists you delegate to.

The hard contract (invariants, cache key, resolution precedence) is documented in
[`docs/SPEC.md`](docs/SPEC.md); the component layout and per-turn flow are in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Development

- **Runtime:** Node >= 22.19.0
- **Install:** `npm install`
- **Test:** `npm test`
- **Typecheck:** `npm run typecheck`

The registration surface is a single factory in
[`extensions/index.ts`](extensions/index.ts) — the `before_agent_start` handler,
`/mode` + `/mode:inspect` commands, and a `session_start` config-seed. All logic
lives in plain modules under `src/` with no pi coupling except through typed
interfaces, which keeps it unit-testable without spinning up pi (tests under
`tests/`).
