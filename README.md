# pi-model-modes

A pi extension that adapts the system prompt per model/mode.

pi discovers and loads this package via the `pi` manifest in `package.json`,
which points at `extensions/index.ts` as the extension entry. That file's
default export is the factory pi calls with its public `ExtensionAPI`.

**Status: scaffold — loads but registers no handler yet.** The
`before_agent_start` handler, mode resolution, and prompt transformation
land in later epics.

## Development

- **Install:** `npm install`
- **Test:** `npm test`
- **Typecheck:** `npm run typecheck`
- **Runtime:** Node >= 22.19.0
