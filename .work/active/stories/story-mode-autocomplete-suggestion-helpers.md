---
id: story-mode-autocomplete-suggestion-helpers
kind: story
stage: implementing
tags: [tests]
parent: feature-mode-command-autocomplete
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# `/mode` autocomplete — pure suggestion helpers

## Scope

Implement the pure (no-pi-coupling) suggestion layer for the `/mode`
autocomplete feature in a new module `src/autocomplete.ts`. This story is
the whole pure layer; the pi seam that consumes it is the sibling story
`story-mode-autocomplete-provider-seam` (which `depends_on` this one).

The full design — architecture, the three resolved open questions
(description sourcing via `formatModeSummary`; no `/mode:inspect`
autocomplete; `off` always surfaced with standard prefix filter), the exact
signatures, the trigger regex, and the rationale for each — lives in the
parent feature body at
`.work/active/features/feature-mode-command-autocomplete.md` under
**Implementation Units → Unit 1**. Read that section before implementing;
this story is its execution container.

## Unit

**File**: `src/autocomplete.ts` (new — pure layer only; the pi seam is added
to the SAME file by the sibling story, mirroring how `commands.ts` holds
both `renderModeInspect` and `registerModeInspectCommand`).

Exports (exact signatures — copy from the feature body):

```ts
export const MODE_OFF_ARG = "off";

export function extractModeArgToken(beforeCursor: string): string | undefined;
export function buildModeArgItems(registry?: PresetRegistry): AutocompleteItem[];
export function filterModeArgItems(items: AutocompleteItem[], token: string): AutocompleteItem[];
export function getModeArgSuggestions(
  beforeCursor: string,
  registry?: PresetRegistry,
): AutocompleteSuggestions | null;
```

Imports:
- `AutocompleteItem`, `AutocompleteSuggestions` from `@earendil-works/pi-tui`
  (type-only — no runtime pi coupling; matches the github-issue-autocomplete
  example's import idiom).
- `loadPresets`, `listPresetNames`, `NONE_PRESET`, `type PresetRegistry` from
  `./presets.js`.
- `formatModeSummary` from `./commands.js` (existing SSOT for the
  composed-axes summary string — reusing it keeps the listing, inspect, and
  autocomplete surfaces byte-consistent).

Constants:
- `MODE_OFF_ARG = "off"` — exported so the sibling seam (and optionally
  `commands.ts`) can reference the same literal.
- `OFF_DESCRIPTION = "clear override — fall back to default"` (private).
- `NONE_DESCRIPTION = "explicit no-mode override — wins over default"`
  (private — `none` and `off` are easy to confuse; the descriptions must
  carry the tiering distinction, not just the names).
- `MODE_ARG_TRIGGER = /^\/mode[ \t]+([^\s]*)$/` (private).

## Implementation notes

- The trigger regex is the load-bearing correctness surface. It naturally
  excludes `/mode:inspect` (no space after `/mode`) and `/model ` (no space
  after `/mode`), and excludes multi-arg lines (`/mode flow extra`) because
  `[^\s]*$` cannot span the embedded space. These exclusions are first-class
  test assertions, not incidental.
- `none` is in `listPresetNames()` but has NO entry in the registry; the
  `name === NONE_PRESET` branch in `buildModeArgItems` must short-circuit
  BEFORE `registry[name]` is read (would otherwise yield `undefined` and
  crash `formatModeSummary`).
- `off` is appended AFTER the presets so the empty-token list reads
  naturally (presets alphabetically, then the special arg). Order does not
  affect pi's filter, only what the user sees first.
- All four functions are pure. `loadPresets()` is memoized in module scope,
  so defaulting the `registry` arg is safe and cheap; tests pass an explicit
  registry built from a known `presets.json` fixture via
  `loadPresets({ json: "..." })` to stay deterministic and avoid the disk
  memo.
- `Preset` and `ResolvedMode` are structurally identical, so
  `formatModeSummary(preset)` is type-safe with no cast.

## Acceptance criteria

Verify against the parent feature body's Unit 1 acceptance list. In short:

- [ ] `extractModeArgToken` matches the trigger matrix exactly:
  - `"/mode "` → `""`, `"/mode fl"` → `"fl"`, `"/mode flow"` → `"flow"`.
  - returns `undefined` for `"/mode"` (no space), `"/mode:inspect "`,
    `"/model fl"`, `"/mode flow extra"` (multi-arg), `""`, `"some text"`.
- [ ] `buildModeArgItems()` returns exactly `listPresetNames().length + 1`
  items (one per preset incl. `none`, plus `off`, in that order).
- [ ] Every preset item has `value === label === <preset name>`.
- [ ] Each real preset item's `description` byte-equals
  `formatModeSummary(registry[name])`.
- [ ] The `none` item's `description === NONE_DESCRIPTION`; the `off` item's
  `description === OFF_DESCRIPTION`.
- [ ] `filterModeArgItems` is case-insensitive prefix match; empty token
  returns all; `"FL"` matches the same set as `"fl"`; no-match returns `[]`.
- [ ] `getModeArgSuggestions("/mode fl", registry)` →
  `{ prefix: "fl", items: [<flow item>] }`; `getModeArgSuggestions("/mode",
  registry)` → `null`.
- [ ] `tests/autocomplete.test.ts` covers all of the above with no pi
  harness imports (pure-module tests only).
- [ ] `npm test` (or the project's test command) is green; no other test
  files change in this story.

## Out of scope

- The pi seam (`registerModeAutocomplete`, `extensions/index.ts` wiring,
  `tests/registration.test.ts` update) — that is
  `story-mode-autocomplete-provider-seam`.
- Any change to `commands.ts`, `presets.ts`, `presets.json`, or the resolver.
- The optional `commands.ts` `MODE_OFF_ARG` consolidation — noted as a
  low-priority follow-up in the parent feature; not required here.

## Dependencies

None. `src/presets.ts` and `src/commands.ts` already export everything this
story consumes.
