---
id: story-mode-autocomplete-provider-seam
kind: story
stage: done
tags: [tests]
parent: feature-mode-command-autocomplete
depends_on: [story-mode-autocomplete-suggestion-helpers]
release_binding: v0.2.0
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# `/mode` autocomplete — pi provider seam + factory wiring

## Scope

Add the thin pi seam that turns the pure suggestion helpers (built by the
sibling story `story-mode-autocomplete-suggestion-helpers`) into a live
autocomplete provider registered with pi, and wire it into the extension
factory. This story is the ONLY place the feature touches `ctx.ui` and the
factory registration surface.

The full design — the `registerModeAutocomplete` signature, the
`ctx.mode === "tui"` guard rationale, the delegation pattern, the
try/catch fail-safe, and the registration-test impact — lives in the parent
feature body at
`.work/active/features/feature-mode-command-autocomplete.md` under
**Implementation Units → Unit 2**. Read that section before implementing;
this story is its execution container.

## Units

### Unit 2a: `registerModeAutocomplete` — `src/autocomplete.ts` (seam, appended to the file the sibling story created)

```ts
export function registerModeAutocomplete(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx: ExtensionContext) => {
    if (ctx.mode !== "tui") return;
    ctx.ui.addAutocompleteProvider((current) => ({
      triggerCharacters: ["/"],
      async getSuggestions(lines, line, col, options) {
        const beforeCursor = (lines[line] ?? "").slice(0, col);
        let suggestions;
        try {
          suggestions = getModeArgSuggestions(beforeCursor);
        } catch {
          return current.getSuggestions(lines, line, col, options);
        }
        if (suggestions === null) return current.getSuggestions(lines, line, col, options);
        if (options.signal?.aborted) return current.getSuggestions(lines, line, col, options);
        return suggestions;
      },
      applyCompletion(lines, line, col, item, prefix) {
        return current.applyCompletion(lines, line, col, item, prefix);
      },
      shouldTriggerFileCompletion(lines, line, col) {
        return current.shouldTriggerFileCompletion?.(lines, line, col) ?? true;
      },
    }));
  });
}
```

Imports to add to `src/autocomplete.ts`:
- `ExtensionAPI`, `ExtensionContext` from `@earendil-works/pi-coding-agent`
  (type-only for `ExtensionContext`; `ExtensionAPI` is used as a value
  parameter type).
- `getModeArgSuggestions` is already in-module (sibling story's export).

### Unit 2b: factory wiring — `extensions/index.ts`

Add one import and one call. Per ARCHITECTURE.md's "edit, don't overwrite"
rule, the factory grows exactly one line:

```ts
import { registerModeAutocomplete } from "../src/autocomplete.js";
// ...
export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", handleBeforeAgentStart);
  registerModeCommand(pi);
  registerModeInspectCommand(pi);
  registerModeAutocomplete(pi);   // NEW
  pi.on("session_start", (e, ctx) => applySessionStart(e.reason, ctx.cwd));
}
```

### Unit 2c: registration test update — `tests/registration.test.ts`

The existing `factory registration wiring` block asserts the factory emits
exactly `["before_agent_start", "session_start"]` as its `on` calls. After
this story the factory emits TWO `session_start` handlers (config-seed +
autocomplete). Update the assertion to the multiset
`["before_agent_start", "session_start", "session_start"]` (or assert
`before_agent_start` count === 1 AND `session_start` count === 2). Keep the
existing assertions that:
- `before_agent_start` is registered by reference (same function object the
  tests import).
- The two `/mode` commands are still registered (`mode`, `mode:inspect`).
- No `registerShortcut` calls (cycle keybindings still not auto-registered).

### Unit 2d (small): SPEC note — `docs/SPEC.md`

Rolling-foundation: the autocomplete registration is a new public behavior
of the extension. Add a one-line note in the "Switching paths" §1
(`/mode <name|preset>`) paragraph noting that in TUI mode the `<preset>`
argument is discoverable via autocomplete (preset names + `off`), sourced
from `loadPresets()`. No other SPEC change — autocomplete is a
discoverability layer, not a new switching path or a change to resolver
semantics or the cache contract.

## Implementation notes

- The `ctx.mode !== "tui"` guard is mandatory. `addAutocompleteProvider` is
  a TUI-only affordance; print/json/rpc sessions have no editor to render
  into. Per docs/extensions.md §`ctx.mode`.
- The try/catch around `getModeArgSuggestions` is defensive: a corrupted
  bundled `presets.json` would throw out of `loadPresets()`. The bundled
  file is build-validated, but delegating to `current` on throw keeps the
  editor responsive under failure and costs nothing.
- `applyCompletion` and `shouldTriggerFileCompletion` ALWAYS delegate to
  `current` — the default insert behavior (replace `prefix` with
  `item.value`) is exactly what `/mode <preset>` wants.
- `triggerCharacters: ["/"]` is advisory. The actual gate is the
  `extractModeArgToken` regex from the sibling story; the provider is
  correct regardless of pi's re-query behavior on space.
- The seam tests need `makeContext` overrides for `mode` and
  `ui.addAutocompleteProvider`. The harness's fail-fast Proxy surfaces
  these as deliberate additions (the harness docstring names `ctx.ui` as a
  real surface tests must supply). A recording `ui.addAutocompleteProvider`
  stub captures the provider closure for offline inspection.

## Implementation log

- Appended `registerModeAutocomplete(pi)` to `src/autocomplete.ts`; it
  registers one `session_start` handler, gates on `ctx.mode === "tui"`,
  delegates non-`/mode`/aborted/failing suggestions to the current provider,
  and delegates completion/file-trigger behavior.
- Wired `registerModeAutocomplete(pi)` into `extensions/index.ts`.
- Added seam coverage for lazy registration, TUI gating, provider delegation,
  `/mode fl` interception, and defensive fallback when preset loading throws.
- Updated factory registration expectations for two `session_start` handlers
  and documented TUI autocomplete discoverability in `docs/SPEC.md`.

## Acceptance criteria

Verify against the parent feature body's Unit 2 acceptance list. In short:

- [ ] `registerModeAutocomplete(pi)` registers exactly one `session_start`
  handler and nothing else (no command, shortcut, tool, flag, renderer, or
  provider registration at call time).
- [ ] Driving the registered handler with `ctx.mode === "tui"` calls
  `ctx.ui.addAutocompleteProvider` exactly once; the recorded provider's
  `applyCompletion` and `shouldTriggerFileCompletion` delegate to the
  `current` passed in by the stack.
- [ ] Driving the registered handler with `ctx.mode === "print"` (or
  `"json"` / `"rpc"`) returns early WITHOUT calling
  `ctx.ui.addAutocompleteProvider`.
- [ ] The recorded provider's `getSuggestions`, on a non-`/mode` line,
  returns whatever `current.getSuggestions` returns (delegation proven via a
  sentinel).
- [ ] The recorded provider's `getSuggestions`, on `/mode fl` before the
  cursor, returns `{ prefix: "fl", items: [<flow>] }` and does NOT call
  `current.getSuggestions`.
- [ ] If `getModeArgSuggestions` throws (force it via a stub), the provider
  delegates to `current.getSuggestions` rather than propagating.
- [ ] `tests/registration.test.ts` updated to expect two `session_start`
  `on` calls; all other registration assertions preserved.
- [ ] `docs/SPEC.md` "Switching paths" carries the one-line autocomplete
  note.
- [ ] `npm test` is green across the whole suite.

## Out of scope

- The pure helpers — that is
  `story-mode-autocomplete-suggestion-helpers` (a hard `depends_on`).
- Any change to resolver semantics, the cache contract, the no-arg listing
  layout, or `/mode:inspect`.
- Custom `applyCompletion` insertion logic (default delegation is correct).
- The optional `commands.ts` `MODE_OFF_ARG` consolidation — noted as a
  low-priority follow-up in the parent feature; pick it up here only if
  trivial, otherwise leave for a later cleanup item.

## Dependencies

- `story-mode-autocomplete-suggestion-helpers` — must land first; this
  story imports `getModeArgSuggestions` (and the `MODE_OFF_ARG` constant if
  the implementor opts into the optional `commands.ts` consolidation).
