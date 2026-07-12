---
id: feature-style-command-family
kind: feature
stage: implementing
tags: []
parent: null
depends_on: []
release_binding: null
gate_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# `/style` command family

## Brief

Make writing styles discoverable and switchable from Pi without hand-editing
`pi-model-modes.json`. Add a dedicated `/style` command family because writing
style is orthogonal to working mode: modes govern how the agent approaches the
work, while styles govern how it communicates with the user.

The command family should mirror `/mode`'s two-tier interaction model. A normal
selection is an ephemeral session override for experimentation; a `default`
subcommand manages durable project or global configuration. The no-argument
command is a display-only status and catalog panel, and TUI autocomplete makes
all valid actions and style names discoverable.

## Scope

In scope:
- `/style` displays the effective style, its source tier, and the available
  bundled and registered custom styles.
- `/style <name>` sets a validated session override immediately.
- `/style none` explicitly disables writing-style injection for the session.
- `/style off` clears only the session override and reveals the effective
  configured default, if any.
- `/style default` displays global, project, and effective durable selections.
- `/style default <name|none> [--global]` writes the selected scope while
  preserving sibling config keys and applies the result immediately.
- `/style default off [--global]` removes `writingStyle` from the selected
  config scope and applies the newly effective value immediately.
- TUI autocomplete covers style names, `none`, `off`, `default`, and
  `--global` at the appropriate grammar stages.
- `/mode:inspect` continues to report the effective style after command-driven
  changes.
- Foundation docs and user documentation describe the command surface and the
  style/mode boundary.

Out of scope:
- Creating, editing, importing, or deleting custom style files through Pi.
  `customStyles` registration remains config-file-managed.
- An interactive TUI picker; the first version uses the project's established
  display-panel, autocomplete, and toast patterns.
- Adding writing style to the persistent mode footer.
- Any change to mode composition or the bundled style texts.

## Strategic decisions

- **Command home**: use a standalone `/style` family, not `/mode style` — style
  is an orthogonal communication layer and should not appear to be a working
  mode axis.
- **Persistence model**: mirror modes — plain `/style <name>` is an ephemeral
  session override; `/style default ...` manages durable project/global
  configuration.
- **No-argument experience**: show effective status and the complete catalog,
  with source information, in one display-only panel; autocomplete supports the
  faster selection path.
- **Behavioral boundary**: writing style affects only user-facing conversational
  communication across interactions. It must not alter code style, code
  comments, authored project documentation, implementation strategy,
  problem-solving approach, autonomy, tool use, or edit scope.

## Dependencies

None. The style resolver, secure custom-style registry, config scopes, command
rendering conventions, strict config writer pattern, and multi-stage TUI
autocomplete already exist as seams. The two-tier override/default style model
is new and is established by Unit 1.

## Design notes

Design should preserve the existing distinctions between `none` and `off`:
`none` is an explicit higher-precedence no-style selection, while `off` removes
that tier and falls back. It should also preserve custom-style provenance when
a session override selects a name whose effective registration comes from the
project or global config.

## Design decisions

- **State shape**: style selection gains the same two tiers as mode selection:
  an ephemeral session override over a durable config default. The custom-style
  registry remains orthogonal state shared by both tiers.
- **Effective source reporting**: keep fragment provenance (`bundled`,
  `custom-global`, `custom-project`) distinct from selection provenance
  (`override`, `project`, `global`, `unset`). Collapsing these would produce
  misleading output such as treating a project-selected bundled style as a
  “bundled default.”
- **Session lifecycle**: `/reload` and initial `startup` preserve a session
  override while refreshing config defaults and custom registrations;
  `/new`, `/resume`, and `/fork` clear the style override before reseeding,
  matching `/mode`.
- **Immediate effect**: command mutations update in-memory state immediately.
  No `/reload` and no agent turn are required to make `/style` or
  `/mode:inspect` report the new state; the next agent turn naturally misses
  the prompt cache because the style signature changed.
- **Config safety**: durable writes use the existing strict-read, sibling-
  preserving, two-space JSON, atomic-rename pipeline. A malformed target is
  refused, and clearing an absent key is a write-free no-op.
- **Global validation**: `/style default <custom> --global` may select bundled
  styles or custom styles registered in global config, but must reject a name
  registered only by the current project. A global default must remain usable
  outside the current project.
- **Reserved names**: `none`, `off`, and `default` are command/control tokens
  and become invalid custom-style names. Config seeding warns and ignores such
  registrations rather than exposing names that the command grammar cannot
  select unambiguously.
- **UI implementation**: reuse the established display-only panel, toast, and
  layered autocomplete conventions. A custom picker and footer change add Pi
  coupling without improving the fast path enough to justify it.
- **Mockups**: skipped. This is a minor extension of established text-command,
  toast, and autocomplete surfaces, not a net-new visual screen or novel
  composition.
- **Execution capability**: direct-read design. The feature is bounded to the
  existing style/config/command/autocomplete seams; no exploratory fanout was
  needed.

## Architectural choice

### Chosen: evolve the style domain, then adapt it through a dedicated command

Turn `src/style.ts` into the single source of truth for style tiers, effective
selection, catalog discovery, validation, and fragment provenance. Keep the Pi
command in a new cohesive `src/style-command.ts` module, with pure parsers and
formatters above one thin `registerStyleCommand(pi)` seam. Add a separate
style-autocomplete core/seam so style discovery can consume the live custom
registry without coupling mode autocomplete to style state.

This follows the project's pure-core/thin-Pi-seam and state-reset patterns. It
also keeps `src/commands.ts`, already responsible for the sizeable `/mode`
family and inspect panel, from becoming a mixed mode/style command monolith.

### Alternatives weighed

1. **Write config directly from `/style <name>`** — rejected by the chosen
   session/default interaction model; it makes experimentation unexpectedly
   durable and provides no override tier.
2. **Generalize mode and style behind one generic layered-selection engine** —
   rejected as premature. Mode materializes axis fragments and style resolves
   one named fragment plus a scoped custom registry; their shared precedence
   shape is too small to justify erasing their domain-specific invariants.
3. **Fold `/style` into `src/commands.ts` and the existing mode autocomplete
   provider** — rejected for cohesion. Shared low-level parsing/filter helpers
   can be reused, but registration and domain logic should remain separately
   named and testable.
4. **Use Pi's `getArgumentCompletions` callback only** — rejected because the
   command has a multi-stage grammar (`default`, action, `--global`) and the
   project already has a tested layered provider for whole-line parsing and
   delegation. The provider also supports live custom style names.

## Implementation Units

### Unit 1: Two-tier style state and catalog

**Files**: `src/style.ts`, `tests/style.test.ts`,
`tests/handler-style.test.ts`

```ts
export type StyleSelectionSource =
  | "override"
  | "project"
  | "global"
  | "unset";

export interface StyleConfigState {
  selection: string | undefined;
  source: "project" | "global" | "unset";
  registry: ReadonlyMap<string, CustomStyleEntry>;
}

export interface AvailableStyle {
  name: string;
  fragmentSource: "bundled" | "custom-global" | "custom-project";
}

export interface StylePlan {
  name: string | undefined;
  fragmentSource: StyleSource; // bundled/custom provenance / none / unset
  selectionSource: StyleSelectionSource;
  content: string;
  signature: string;
}

export function configureStyleDefaults(state: StyleConfigState): void;
export function setActiveStyle(name: string): void;
export function clearActiveStyle(): void;
export function getActiveStyle(): string | undefined;
export function getDefaultStyle(): string | undefined;
export function getEffectiveStyleSelectionSource(): StyleSelectionSource;
export function listAvailableStyles(): readonly AvailableStyle[];
export function resolveActiveStylePlan(): StylePlan;
export function resetStyleForTesting(): void;
```

**Implementation notes**:
- Store `activeSelection`, `defaultSelection`, `defaultSource`, and a defensively
  cloned registry at module scope; getters and catalog results return fresh
  data. `resetStyleForTesting()` clears all four fields.
- `configureStyleDefaults` replaces only default/registry state. It never clears
  `activeSelection`, allowing same-session reload and durable writes to preserve
  the override.
- `setActiveStyle` accepts `none`; every other name is fully resolved internally
  before assignment so invalid input leaves the prior override intact. There is
  no separate public validator that callers could forget to invoke.
- `resolveActiveStylePlan` chooses `activeSelection ?? defaultSelection`, then
  resolves custom-before-bundled exactly as today. The content signature stays
  content-derived, so changing only the source tier without changing bytes does
  not churn the provider prompt cache.
- `listAvailableStyles` is deterministic and filename/name sorted. A valid
  custom registration replaces a bundled entry of the same name, preserving
  current custom-wins behavior. It returns only real bundled/custom styles;
  `none`, `off`, and `default` are control tokens added by the command layer.

**Acceptance criteria**:
- [ ] Override wins over project/global default; clearing it reveals the default.
- [ ] `none` at either tier yields empty content/signature while reporting its
  selection tier.
- [ ] Invalid override attempts throw without replacing the prior override.
- [ ] Catalog order is stable and custom collisions replace bundled provenance.
- [ ] Returned registries/catalog data cannot mutate internal state.
- [ ] Style content remains communication-only; no mode resolver, tool, scope,
  code-style, comment-style, or documentation-authoring state is introduced.
- [ ] Handler splice output and cache-key bytes remain byte-identical for the
  same style content. Existing test fixtures migrate from `setStyleSelection`
  to the new tier APIs while their prompt-byte assertions stay unchanged.

### Unit 2: Config reconciliation and durable style writer

**Files**: `src/config.ts`, `tests/config.test.ts`
**Story**: `story-style-selection-tiers-config`

```ts
export type StyleDefaultSource = "global" | "project" | "unset";

export function applyStyleFromConfig(cwd: string): void;
export function effectiveStyleDefaultSource(cwd: string): {
  value: string | undefined;
  source: StyleDefaultSource;
};
export function readStyleDefaultSources(cwd: string): {
  global: string | undefined | "(unreadable)";
  project: string | undefined | "(unreadable)";
};
export function writeStyleDefaultToConfig(
  cwd: string,
  value: string | typeof DEFAULT_OFF,
  scope: DefaultScope,
): WriteDefaultResult; // shared result shape; a semantic alias is optional
```

**Implementation notes**:
- Extract the mechanics shared by `writeDefaultToConfig` and the new style
  writer into one private scalar-config-key write helper. Preserve the existing
  mode writer's public types and exact behavior as regression protection.
- `applyStyleFromConfig` computes scalar selection provenance before calling
  `configureStyleDefaults`; malformed values and invalid registrations warn and
  degrade independently while valid siblings survive.
- On `new`/`resume`/`fork`, `applySessionStart` clears both mode and style
  overrides. On `startup`/`reload`, it preserves both, then reconciles defaults.
- The style writer mutates only `writingStyle`, calls `applyStyleFromConfig`
  rather than `applySessionStart`, and never refreshes the mode-only footer.
- Scope-aware validation happens before writing. Project writes validate against
  merged global+project registrations. Global-write validation uses
  `readStyleConfigScopes(cwd).global.customStyles` plus bundled names, and
  rejects project-only registrations with a precise error before any write.
- `writingStyle: "none"` remains the durable suppression sentinel. Reserved-name
  rejection applies to `customStyles` keys; `writingStyle: "off"` or
  `writingStyle: "default"` is an unknown selection that warns/degrades, never
  a config clear. Only `/style default off` deletes the key.

**Acceptance criteria**:
- [ ] Project style default wins over global; project `none` masks global.
- [ ] Clearing project falls back to global, not unset; clearing absent scope is
  byte-stable and creates no file/directory.
- [ ] Writes preserve `defaultMode`, `customStyles`, `cycleKeybinding`, and
  unknown sibling keys; malformed/non-object JSON is never overwritten.
- [ ] Writes are two-space JSON with trailing newline and atomic temp+rename.
- [ ] A successful durable write updates default/registry state but preserves an
  active style override.
- [ ] Same-session reload preserves style override; new/resume/fork clears it.
- [ ] Global writes reject project-only custom styles before touching disk.
- [ ] Reserved custom names (`none`, `off`, `default`) warn with the token named
  and degrade without poisoning valid entries; control-like `writingStyle`
  scalar values never acquire command semantics during config loading.
- [ ] Existing `/mode default` writer tests remain green unchanged.

### Unit 3: `/style` parser, panels, and Pi seam

**Files**: `src/style-command.ts`, `src/command-parse-utils.ts`, `extensions/index.ts`,
`tests/style-command.test.ts`, `tests/registration.test.ts`
**Story**: `story-style-command-ui-autocomplete`

```ts
export const STYLE_COMMAND = "style";
export const STYLE_LISTING_MESSAGE_TYPE = "style";
export const STYLE_DEFAULT_MESSAGE_TYPE = "style-default";

export type StyleDefaultSubcommand =
  | { kind: "display" }
  | { kind: "set"; value: string; scope: DefaultScope }
  | { kind: "clear"; scope: DefaultScope }
  | { kind: "error"; message: string };

export function parseStyleDefaultArgs(args: string): StyleDefaultSubcommand;
export function formatStyleListing(
  effective: StylePlan | { error: string },
  styles: readonly AvailableStyle[],
): string;
export function formatStyleDefaultListing(/* raw scopes + effective */): string;
export function registerStyleCommand(pi: ExtensionAPI): void;
```

**Command grammar**:

```text
/style
/style <name|none>
/style off
/style default
/style default [--global] <name|none|off> [--global]
```

**Panel contract**:

```text
Effective style: clear (override)
  fragment: bundled
Available styles:
  - clear (bundled)
  - team-voice (custom, project)
```

`none` reports as `Effective style: none (<selection source>)`; unset reports
`Effective style: unset`. Both omit the `fragment:` sub-line because no fragment
exists. Resolution failures render an explicit
`(unresolvable — …)` line without crashing or hiding the catalog.

**Implementation notes**:
- Extract the shared scalar-default grammar into a small pure
  `src/command-parse-utils.ts` helper consumed by both `/mode default` and
  `/style default`; command-specific wrappers supply usage/error labels. Extract
  the existing case-insensitive autocomplete prefix filter there as well.
- The default parser mirrors `/mode default` exactly: case-sensitive control
  tokens, position-flexible single `--global`, and precise errors for duplicate
  flags, unknown flags, missing actions, and extra positionals.
- No-arg and bare-default panels are display-only `sendMessage` calls with no
  triggered turn, matching existing command rendering conventions.
- `off` clears only the session override. `none` sets an explicit no-style
  override. Unknown names notify as errors and leave state unchanged.
- Durable notifications distinguish three masking cases: session override still
  wins, project default masks a global write, or the written value becomes
  effective. Messages point to `/style off` or `/style default off` as the
  appropriate next action.
- Factory registration adds `/style` and one TUI-only `session_start`
  autocomplete provider. It adds no shortcuts, tools, renderers, footer state,
  or input/key handlers.

**Acceptance criteria**:
- [ ] `/style` emits source-tier status and bundled/custom catalog without
  triggering an agent turn.
- [ ] `/style <name|none>` changes only the session override and immediately
  appears in `/mode:inspect`.
- [ ] `/style off` reveals project/global default or unset with a truthful toast.
- [ ] `/style default` reports global, project, and effective durable values;
  `default none` persists suppression while `default off` deletes the selected
  scope's key and reveals any lower-precedence value.
- [ ] Durable set/clear errors never mutate files or effective state.
- [ ] All command paths preserve the active mode and mode-only footer.
- [ ] Registration tests enumerate the new `STYLE_COMMAND` and third
  `session_start` handler while proving no unintended Pi surfaces were added.

### Unit 4: Live multi-stage autocomplete

**Files**: `src/style-autocomplete.ts`, `extensions/index.ts`,
`tests/style-autocomplete.test.ts`
**Story**: `story-style-command-ui-autocomplete`

```ts
export function buildStyleArgItems(
  styles: readonly AvailableStyle[],
): AutocompleteItem[];
export function getStyleArgSuggestions(
  beforeCursor: string,
  styles: readonly AvailableStyle[],
): AutocompleteSuggestions | null;
export function registerStyleAutocomplete(pi: ExtensionAPI): void;
```

**Implementation notes**:
- Stage 1 `/style <partial>` offers available names + `none`, `off`, `default`.
  Stage 2 `/style default <partial>` offers names + `none`, `off`. Stage 3
  offers `--global` after an action.
- Descriptions state both fragment provenance and control-token semantics.
- Resolve `listAvailableStyles()` at suggestion time, not registration time, so
  command-driven config/custom-registry changes appear immediately.
- Register one TUI-only `session_start` provider and delegate all non-style
  lines, completion application, file-completion decisions, aborted requests,
  and discovery failures to the underlying provider.

**Acceptance criteria**:
- [ ] Empty and partial tokens return deterministic, case-insensitive matches.
- [ ] Custom project/global names and provenance appear in suggestions.
- [ ] Multi-stage grammar excludes meaningless repeated `default` suggestions.
- [ ] `/style`, `/mode`, `/mode:inspect`, ordinary text, and multi-token invalid
  lines do not cross-match each other's provider.
- [ ] Print/JSON/RPC modes do not register the TUI provider.

### Unit 5: Inspect and rolling documentation

**Files**: `src/commands.ts`, `tests/commands.test.ts`, `README.md`,
`docs/SPEC.md`, `docs/ARCHITECTURE.md`
**Story**: `story-style-command-ui-autocomplete`

**Implementation notes**:
- Extend `StyleInspectInfo` with `selectionSource` and rename its ambiguous
  `source` field to `fragmentSource`. Update the existing exact-string style
  table in `tests/commands.test.ts` for the new two-axis format. Example:
  `Style: clear (override; bundled)`
  or `Style: team (project default; custom, global)`.
- Roll foundation docs forward from “config-only” to the new two-path command +
  config model. Reiterate that style controls conversational communication only.
- README gets a compact command grammar and examples; it must not imply style
  affects code/comments/docs/problem-solving.

**Acceptance criteria**:
- [ ] Inspect distinguishes override/project/global/unset and custom fragment
  origin, including explicit `none`.
- [ ] README examples cover temporary, persistent project/global, masking, and
  clearing behavior.
- [ ] SPEC and ARCHITECTURE match the implemented tier lifecycle and data flow.
- [ ] No stale “selection is config-only” assertion remains.

## Implementation order

1. `story-style-selection-tiers-config` — Units 1–2 establish state and durable
   mutation contracts.
2. `story-style-command-ui-autocomplete` — Units 3–5 consume those contracts;
   depends on the first story.

The chain is intentionally sequential: command handlers and autocomplete must
not invent temporary state while the resolver contract is still changing.

## Testing

### Unit and state tests

- Tier precedence matrix: unset/default/override/none/clear.
- Mutation safety: failed validation preserves the previous override/default.
- Registry cloning, deterministic catalog ordering, bundled/custom collision.
- Session lifecycle matrix across startup/reload/new/resume/fork.

### Filesystem/config tests

- Global/project merge and source attribution.
- Strict malformed target refusal, sibling preservation, no-op clear, atomic
  serialization shape, and project-to-global fallback.
- Scope-aware custom-style validation, including symlink/path protections
  already enforced by the style registry.
- Regression suite for the existing mode writer after shared-helper extraction.

### Command and autocomplete tests

- Parser token/flag matrix, exact display panel states, truthful notification
  branches, no-turn display behavior, and prior-state preservation on errors.
- Three-stage autocomplete trigger/filter/delegation matrix and live custom
  catalog changes.
- Factory registration counts and command names.

### Integration tests

- Set override → next `before_agent_start` includes style and reports a
  style-switched cache reason.
- Clear override → configured fallback becomes effective.
- Durable write under override → override remains effective until `/style off`.
- All style commands leave active mode, mode footer, and non-style prompt bytes
  untouched.

Verification commands:

```bash
npm test
npm run typecheck
```

## Advisory review

A high-effort GLM 5.2 cross-model pass reviewed the design against the current
style/config/command/autocomplete implementation. Accepted corrections are
folded into the units above: reserved-token behavior is explicit; byte-stable
runtime behavior is distinguished from fixture API migration; inspect and
factory test ripples are named; selection and fragment provenance use distinct
names; the config result shape is reused; global custom-style validation is
anchored to the existing scope reader; control tokens are excluded from the
catalog; and shared default-command parsing/filtering gets one pure helper.
No blocking architectural issue remained after these corrections.

## Risks

- **Tier/provenance conflation**: “where the selection came from” and “where the
  fragment file came from” are independent. Mitigation: separate types and
  explicit panel fields.
- **Reload accidentally clears overrides**: today's `applyStyleFromConfig`
  replaces all style state. Mitigation: split config replacement from override
  mutation and add the full session-reason matrix before command work.
- **Global default depends on project-only custom style**: it appears to work in
  one cwd but breaks elsewhere. Mitigation: scope-aware pre-write validation.
- **Config writer drift**: duplicating atomic-write logic would let mode/style
  safety semantics diverge. Mitigation: one private scalar-key write pipeline,
  with existing mode tests as regression guards.
- **Reserved-name compatibility**: existing custom styles named `off` or
  `default` become invalid. Mitigation: explicit warning naming the reserved
  token and documentation directing users to rename it; `none` was already a
  semantic sentinel.
- **Autocomplete provider stacking**: a second provider can accidentally swallow
  `/mode` or file completion. Mitigation: anchored style-only regexes and
  delegation tests for every non-match/error/abort branch.
- **Communication boundary drift**: style prose could be broadened later into
  coding or problem-solving policy. Mitigation: preserve the boundary in the
  SPEC and acceptance tests/review; command work changes selection only, never
  fragment semantics or mode state.
