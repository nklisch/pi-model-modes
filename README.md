# pi-model-modes

A pi extension that adapts the system prompt per model/mode.

pi discovers and loads this package via the `pi` manifest in `package.json`,
which points at `extensions/index.ts` as the extension entry. That file's
default export is the factory pi calls with its public `ExtensionAPI`.

**What it does.** Every turn it tells the model what it is — `You are
{model.name} from {provider}.` — read live from `ctx.model`, and (when a mode is
selected) splices a composable behavioral mode into pi's assembled system
prompt. A mode is one **base** voice + one value from each of three axes
(**agency** × **quality** × **scope**) + zero or more **modifiers**; **presets**
bundle common combinations. Modes are selectable via the `/mode` command, a
`Ctrl+M` / `Shift+Ctrl+M` cycle keybinding, or a plugin-owned config default
(`pi-model-modes.json`), with precedence session-override > config-default >
unset. `/mode:inspect` shows the effective mode, last-change reason, and cache
key. Transforms pi's prompt rather than replacing it — tools, skills, and
`<project_context>` survive; with no mode selected, only the identity line is
added.

The system prompt is byte-stable across turns where nothing relevant changed (a
per-turn cache key over model + mode signature + pi's base keeps provider prefix
caches warm).

## Development

- **Install:** `npm install`
- **Test:** `npm test`
- **Typecheck:** `npm run typecheck`
- **Runtime:** Node >= 22.19.0
