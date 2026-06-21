---
id: feature-mode-command-autocomplete
kind: feature
stage: implementing
tags: []
parent: null
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# `/mode` autocomplete

## Brief

Make `/mode` arguments discoverable. As the user types after the `/mode`
slash command, pi's autocomplete layer surfaces the available preset names
(`default`, `flow`, `safe`, `create`, ...) plus the literal `off`, each with
a one-line description, so the user can pick from a known list instead of
recalling preset names or running `/mode` (no-arg) first.

Today `/mode <name>` requires the user to know preset names by heart. This
feature surfaces them inline so the fast path (typed preset selection) is as
discoverable as the slow path (`/mode` no-arg → read → re-type).

(The companion cycle-keybinding hint that originally lived here has moved to
`feature-mode-footer-indicator` — the footer's persistent visibility is a
better home than this command's no-arg listing.)

## Scope

In scope:
- **Autocomplete.** Register an `addAutocompleteProvider` on `session_start`
  (TUI mode only — guard on `ctx.mode === "tui"`) that:
  - Triggers after the literal `/mode ` token (with trailing space).
  - Returns preset names + the literal `off`, each with a label + description
    sourced from `loadPresets()` and a small static description for `off`.
  - Filters by the partial token after `/mode ` (e.g. `/mode fl` → `flow`).
  - Delegates to the underlying provider for everything else.
- **Tests.** The autocomplete provider's `getSuggestions` filter logic is
  pure given the preset list + cursor text, fully unit-testable.

Out of scope:
- Custom autocomplete for other commands (`/mode:inspect`, etc.) — only
  `/mode` and its `<preset>` argument.
- Any change to resolver state, command surface semantics, or the existing
  no-arg listing layout beyond appending one line.
- An in-line preview of the selected preset's axes inside the autocomplete
  UI (would be nice but depends on autocomplete-item rendering pi may not
  expose).

## Strategic decisions

None. The preset list, the cycle keybinding, and the `/mode` command family
already exist; this is a discoverability layer on top.

## Open questions (for feature-design to resolve)

- **Autocomplete description sourcing.** Presets today are `{base, agency,
  quality, scope, modifiers}` — there's no human description field. The
  autocomplete item description can either be the composed axes summary
  (`flow · autonomous · pragmatic · adjacent · +flow`) or a new optional
  `description` field added to `presets.json`. Composed summary is
  zero-cost and informative enough for v1.
- **Should `/mode:inspect` also get autocomplete?** Probably not — it takes
  no argument. Confirm and skip.
- **Filter behavior on `off`.** The literal `off` clears the override; it
  should appear in the suggestion list, but it's not a preset. Decide
  whether to surface it always or only when the user has typed `o`.

## Dependencies

None. Both the keybinding constants (`src/keybinding.ts`) and the preset
table (`src/presets.ts`) already exist; this consumes them.

## Design decisions (resolves the open questions above)

- **Q1 — Autocomplete description sourcing: composed-axes summary.**
  Reuse `formatModeSummary` from `src/commands.ts` (already the SSOT for the
  composed-axes summary string, used by both the `/mode` no-arg listing and
  `/mode:inspect`) to render each preset item's description as
  `base:X • agency:Y • quality:Z • scope:W • +mod`. This is zero-cost (every
  preset already declares all five components), adds no schema change to
  `presets.json`, and keeps discoverability consistent across all three
  surfaces (listing / inspect / autocomplete). The `Preset` interface is
  structurally identical to `ResolvedMode`, so `formatModeSummary(preset)` is
  type-safe without a cast. A curated one-line `description` field is a clean
  future follow-up — `presets.ts` intentionally keeps `Preset` distinct from
  `ResolvedMode` so it can grow disk-only metadata later (its own docstring
  says so) — but it is NOT in scope for v1.
- **Q2 — `/mode:inspect` autocomplete: no.** `/mode:inspect` takes no
  argument; it renders a status panel from the change signal + live model.
  Autocomplete for a no-arg command is a no-op, so we skip it. The trigger
  regex (see Architecture) naturally excludes `/mode:inspect` because it
  requires a literal space after `/mode`, which `/mode:inspect` does not have.
  It also excludes `/model` for the same reason (no space after `/mode`).
- **Q3 — `off` filter behavior: always surfaced, standard prefix filter.**
  `off` appears in the FULL suggestion list (alongside every preset name +
  the virtual `none`) and is subject to the same case-insensitive
  prefix-match filter as everything else. So `/mode o` filters to `off`
  (and any preset starting with `o`), `/mode fl` filters to `flow`, and the
  empty token (`/mode `) shows the entire list. No special-casing. The list
  is small and bounded (≤15 items), so there's no clutter concern. The
  description for `off` is a short static string (`clear override — fall
  back to default`) that distinguishes it from `none` (`explicit no-mode
  override — wins over default`) — these two are easy to confuse, so the
  descriptions must carry the tiering semantics, not just the names.

## Architectural choice

**One new module `src/autocomplete.ts` with a pure helpers layer + a thin pi
seam, mirroring the existing `commands.ts` split (`renderModeInspect` pure +
`registerModeInspectCommand` seam).** The pure layer is fully unit-testable
with zero pi coupling; the seam is the only place `ctx.ui` is touched.

Registration surface: the factory in `extensions/index.ts` grows one line —
`registerModeAutocomplete(pi)` — alongside the existing `registerModeCommand`
/ `registerModeInspectCommand` calls. This follows ARCHITECTURE.md's "edit,
don't overwrite" rule for the single registration surface.

The provider is registered inside a `session_start` handler (per pi's
contract — `ctx.ui.addAutocompleteProvider` is only reachable from a
session-scoped context) and gated on `ctx.mode === "tui"` so print/json/rpc
sessions never register a UI affordance they can't render. This mirrors the
existing `pi.on("session_start", ...)` config-seed registration; the factory
will end up with TWO `session_start` handlers (config-seed + autocomplete),
which is legal — pi fans out to all handlers for an event.

The provider follows the documented delegation pattern: when the cursor
line is not a `/mode <partial>` invocation, delegate `getSuggestions` /
`applyCompletion` / `shouldTriggerFileCompletion` to the `current` provider
the stack passes in. Only `/mode ` lines are intercepted.

**Alternatives weighed:**
- *Fold the registration into the existing `session_start` config-seed
  handler* — rejected; couples config-seeding with UI registration and
  violates the thin-seam-per-module pattern. Cleaner to keep them as two
  handlers on the same event.
- *Register the provider in the factory body rather than `session_start`* —
  rejected; `ctx.ui` is not available at factory-invocation time, only
  inside event handlers with a session-scoped `ctx`.

## Implementation Units

### Unit 1: Pure suggestion helpers — `src/autocomplete.ts` (pure layer)
**Story**: `story-mode-autocomplete-suggestion-helpers`

```ts
import type {
  AutocompleteItem,
  AutocompleteSuggestions,
} from "@earendil-works/pi-tui";
import { loadPresets, listPresetNames, NONE_PRESET, type PresetRegistry } from "./presets.js";
import { formatModeSummary } from "./commands.js";

/** The literal `off` argument to `/mode` — clears the override (NOT a preset). */
export const MODE_OFF_ARG = "off";

/** Static description for `off` (distinct from `none`'s tiering semantics). */
const OFF_DESCRIPTION = "clear override — fall back to default";
const NONE_DESCRIPTION = "explicit no-mode override — wins over default";

/**
 * Trigger regex: `/mode ` at line start + at least one space + a single
 * whitespace-free partial token, anchored to end-of-input. Naturally
 * excludes `/mode:inspect` (no space) and `/model ` (no space after `/mode`).
 * Excludes multi-arg lines (`/mode flow extra`) because `[^\s]*$` cannot span
 * the embedded space.
 */
const MODE_ARG_TRIGGER = /^\/mode[ \t]+([^\s]*)$/;

/** PURE: extract the partial preset-name token after `/mode `, or
 *  `undefined` when the line is not a `/mode <partial>` invocation (caller
 *  delegates to the underlying provider). */
export function extractModeArgToken(beforeCursor: string): string | undefined {
  return beforeCursor.match(MODE_ARG_TRIGGER)?.[1];
}

/** PURE: build the FULL (unfiltered) suggestion item list — one item per
 *  preset name (incl. virtual `none`) plus the literal `off`. Each preset's
 *  description is the composed-axes summary via `formatModeSummary`; `none`
 *  and `off` get explicit tiering descriptions. */
export function buildModeArgItems(registry: PresetRegistry = loadPresets()): AutocompleteItem[] {
  const presetItems: AutocompleteItem[] = listPresetNames(registry).map((name) => ({
    value: name,
    label: name,
    description: name === NONE_PRESET
      ? NONE_DESCRIPTION
      : formatModeSummary(registry[name]),
  }));
  return [
    ...presetItems,
    { value: MODE_OFF_ARG, label: MODE_OFF_ARG, description: OFF_DESCRIPTION },
  ];
}

/** PURE: case-insensitive prefix filter. Empty token → all items. */
export function filterModeArgItems(items: AutocompleteItem[], token: string): AutocompleteItem[] {
  if (token === "") return items;
  const lower = token.toLowerCase();
  return items.filter((i) => i.value.toLowerCase().startsWith(lower));
}

/** PURE: top-level entry — returns `null` when not a `/mode <partial>` line
 *  (caller delegates), or `{ prefix, items }` when it is. `prefix` is the
 *  bare partial token so pi replaces exactly that region on accept. */
export function getModeArgSuggestions(
  beforeCursor: string,
  registry: PresetRegistry = loadPresets(),
): AutocompleteSuggestions | null {
  const token = extractModeArgToken(beforeCursor);
  if (token === undefined) return null;
  return { prefix: token, items: filterModeArgItems(buildModeArgItems(registry), token) };
}
```

**Implementation notes**:
- `formatModeSummary` is imported from `commands.ts` (existing SSOT).
  `Preset` and `ResolvedMode` are structurally identical, so the call is
  type-safe — no cast, no wrapper.
- `none` is in `listPresetNames()` but has no `registry` entry; the `===
  NONE_PRESET` branch short-circuits before `registry[name]` is read.
- `off` is appended after presets so the list reads naturally (presets
  alphabetically, then the special arg). Order does not affect pi's
  prefix-filter, but it affects what the user sees first in the empty-token
  case — keeping `off` last is the least surprising.
- All helpers are pure: same inputs → same outputs, no pi imports, no I/O.
  `loadPresets()` is memoized in module scope (the bundled `presets.json`
  does not change in-process), so defaulting the `registry` arg is safe and
  cheap.

**Acceptance criteria**:
- [ ] `extractModeArgToken("/mode ")` → `""`; `("/mode fl")` → `"fl"`;
  `("/mode flow")` → `"flow"`.
- [ ] `extractModeArgToken` returns `undefined` for: `"/mode"` (no space),
  `"/mode:inspect "`, `"/model fl"`, `"/mode flow extra"` (multi-arg),
  `""`, `"some text"`.
- [ ] `buildModeArgItems()` returns one item per `listPresetNames()` entry
  PLUS one `off` item, in that order.
- [ ] Every preset item's `value === label === <preset name>`.
- [ ] A real preset's description equals `formatModeSummary(registry[name])`
  exactly (byte-for-byte).
- [ ] The `none` item's description is `NONE_DESCRIPTION`; the `off` item's
  description is `OFF_DESCRIPTION`.
- [ ] `filterModeArgItems(items, "")` returns all items; `(items, "fl")`
  returns only items whose `value` starts with `fl` (case-insensitive:
  `"FL"` and `"fl"` match the same set).
- [ ] `getModeArgSuggestions("/mode fl", registry)` returns
  `{ prefix: "fl", items: [<flow item>] }`; `getModeArgSuggestions("/mode",
  registry)` returns `null`.

---

### Unit 2: pi seam — provider registration — `src/autocomplete.ts` (seam) + `extensions/index.ts`
**Story**: `story-mode-autocomplete-provider-seam`

```ts
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { AutocompleteProvider } from "@earendil-works/pi-tui";
import { getModeArgSuggestions } from "./autocomplete.js";

/** Register the `/mode <arg>` autocomplete provider on `session_start`,
 *  TUI mode only. Mirrors `registerModeCommand` / `registerModeInspectCommand`
 *  — thin pi seam, no logic. */
export function registerModeAutocomplete(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx: ExtensionContext) => {
    if (ctx.mode !== "tui") return;          // print/json/rpc — no UI to render into
    ctx.ui.addAutocompleteProvider((current) => ({
      triggerCharacters: ["/"],               // advisory — the regex is the real gate
      async getSuggestions(lines, line, col, options) {
        const beforeCursor = (lines[line] ?? "").slice(0, col);
        let suggestions;
        try {
          suggestions = getModeArgSuggestions(beforeCursor);
        } catch {
          return current.getSuggestions(lines, line, col, options); // fail-safe
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

And the factory wire (`extensions/index.ts`) — add one line:
```ts
import { registerModeAutocomplete } from "../src/autocomplete.js";
// ...
export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", handleBeforeAgentStart);
  registerModeCommand(pi);
  registerModeInspectCommand(pi);
  registerModeAutocomplete(pi);                                       // NEW
  pi.on("session_start", (e, ctx) => applySessionStart(e.reason, ctx.cwd));
}
```

**Implementation notes**:
- `ctx.mode !== "tui"` guard is mandatory — `addAutocompleteProvider` is a
  TUI-only affordance; print/json/rpc sessions have no editor to render
  suggestions into. Per docs/extensions.md §`ctx.mode`.
- `getSuggestions` wraps `getModeArgSuggestions` in a try/catch that
  delegates to `current` on throw — never let a corrupted bundled
  `presets.json` crash the editor's autocomplete. (Build-validated, but
  defensive delegation costs nothing.)
- `applyCompletion` and `shouldTriggerFileCompletion` always delegate to
  `current` — the default insertion behavior (replace `prefix` with
  `item.value`) is exactly what `/mode <preset>` wants; no custom insertion.
- `triggerCharacters: ["/"]` is advisory — pi's built-in slash provider
  already triggers on `/`; declaring it keeps this provider in pi's
  re-query set. The actual gate is the `extractModeArgToken` regex.
- **Registration-test impact:** `tests/registration.test.ts` currently
  asserts `events.toEqual(["before_agent_start", "session_start"])` (exactly
  one `session_start`). After this unit, the factory registers TWO
  `session_start` handlers (config-seed + autocomplete). Update that test
  to assert the multiset `["before_agent_start", "session_start",
  "session_start"]` (or assert ≥1 `session_start` + ≥1 `before_agent_start`).
- **Optional SSOT consolidation (low priority):** `commands.ts` has its own
  inline `arg === "off"` literal; this unit introduces `MODE_OFF_ARG`. A
  trivial follow-up (or this unit, if the implementor prefers) changes
  `commands.ts` to import `MODE_OFF_ARG` instead of the literal. Not
  required for acceptance — the literal `"off"` is a stable user-facing
  token.

**Acceptance criteria**:
- [ ] `registerModeAutocomplete(pi)` registers exactly one `session_start`
  handler (no other pi surface touched at registration time).
- [ ] When invoked with `ctx.mode === "tui"`, the session_start handler
  calls `ctx.ui.addAutocompleteProvider` exactly once with a provider whose
  `applyCompletion` and `shouldTriggerFileCompletion` delegate to `current`.
- [ ] When invoked with `ctx.mode === "print"` (or `"json"` / `"rpc"`), the
  handler returns early WITHOUT calling `ctx.ui.addAutocompleteProvider`.
- [ ] The provider's `getSuggestions`, given a `lines`/`col` whose
  before-cursor text is not a `/mode <partial>` line, delegates to
  `current.getSuggestions` (returns whatever `current` returns).
- [ ] The provider's `getSuggestions`, given `/mode fl` before the cursor,
  returns `{ prefix: "fl", items: [<flow>] }` and does NOT call
  `current.getSuggestions`.
- [ ] If `getModeArgSuggestions` throws, the provider delegates to
  `current.getSuggestions` rather than propagating.
- [ ] `tests/registration.test.ts` is updated to allow two `session_start`
  registrations and still proves the factory registers `before_agent_start`
  by reference and the two `/mode` commands.
- [ ] `docs/SPEC.md`'s "Switching paths" section gains a one-line note that
  `/mode <arg>` is discoverable via autocomplete in TUI mode (rolling-
  foundation: the autocomplete registration is a new public behavior).

## Implementation Order

1. `story-mode-autocomplete-suggestion-helpers` — pure helpers + unit tests.
   No pi imports, no factory changes. Lands fully green on its own.
2. `story-mode-autocomplete-provider-seam` — registers the provider, wires
   the factory, updates the registration test, adds the SPEC note.
   `depends_on: [story-mode-autocomplete-suggestion-helpers]`.

Strictly sequential — the seam consumes the pure helpers by name.

## Testing

### Unit tests: `tests/autocomplete.test.ts` (story 1)

Pure-helper coverage, no pi harness:
- `extractModeArgToken`: the trigger matrix above (positive + negative
  cases, including the `/mode:inspect` and `/model ` exclusions as
  first-class assertions — they are the load-bearing correctness claims).
- `buildModeArgItems`: count equals `listPresetNames().length + 1`;
  each preset item's description byte-equals `formatModeSummary(preset)`;
  `none` and `off` items carry their explicit descriptions.
- `filterModeArgItems`: empty → all; case-insensitive prefix; no-match → `[]`.
- `getModeArgSuggestions`: end-to-end — `null` on non-`/mode` lines,
  `{ prefix, items }` on `/mode <partial>`, prefix is the bare token.

### Integration: `tests/registration.test.ts` + seam tests (story 2)

- `registerModeAutocomplete(pi)` registers exactly one `session_start`
  handler; no other registrations.
- Drive the registered `session_start` handler with a stub `ctx` whose
  `mode === "tui"` and `ui.addAutocompleteProvider` records the provider;
  assert it was called once and the recorded provider's `applyCompletion`
  delegates to the `current` passed in.
- Same drive with `mode === "print"` → `addAutocompleteProvider` not called.
- Drive the recorded provider's `getSuggestions` with a `current` stub
  that returns a sentinel; assert delegation on non-`/mode` lines and
  non-delegation (own suggestions) on `/mode fl`.
- Update the existing `factory registration wiring` block to expect two
  `session_start` `on` calls plus the `before_agent_start` reference +
  the two commands.

The seam tests will need `makeContext` overrides for `mode` and
`ui.addAutocompleteProvider` — the harness's fail-fast Proxy surfaces
these as deliberate additions (the harness comment names `ctx.ui` as a
real surface tests must supply).

## Risks

- **`loadPresets()` throw inside the provider** — a corrupted bundled
  `presets.json` would throw. Mitigation: the seam's `getSuggestions` wraps
  the call in try/catch and delegates to `current` on throw. (Low; the
  bundled file is build-validated, but defensive delegation is cheap and
  keeps the editor responsive under failure.)
- **SSOT drift on the `"off"` literal** — `commands.ts` has its own inline
  `arg === "off"`; this feature adds `MODE_OFF_ARG`. Mitigation: optional
  consolidation noted in Unit 2. (Low; stable user-facing token.)
- **Registration-test coupling** — the existing `registration.test.ts`
  asserts an exact event multiset. Adding a second `session_start` will
  break it; the update is part of Unit 2's acceptance criteria, so it is
  not a surprise.
- **`triggerCharacters` semantics** — pi's exact re-query behavior on space
  (after `/mode`) is not exhaustively documented. The `extractModeArgToken`
  regex is the real gate, so the provider is correct regardless; if pi does
  not re-query on space in some terminal, the user can force a refresh by
  typing another character. (Low; correctness does not depend on the
  advisory trigger set.)

## Next

Design complete — advanced to `stage: implementing`. Two child stories
queued:
- `story-mode-autocomplete-suggestion-helpers` (no deps)
- `story-mode-autocomplete-provider-seam` (depends on the helpers)

Run `/agile-workflow:implement story-mode-autocomplete-suggestion-helpers`
then `... provider-seam`, or hand the feature to
`/agile-workflow:implement-orchestrator feature-mode-command-autocomplete`
for dependency-ordered dispatch.
