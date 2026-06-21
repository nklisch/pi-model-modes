---
id: feature-mode-footer-indicator
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

# Mode indicator in the TUI footer

## Brief

Show the effective mode — the same composed state `getEffectiveModeSource()` /
`resolveActiveModePlan()` already hold — as a persistent indicator in pi's TUI
footer, so the user can see at a glance what behavioral shape the next turn
will take without running `/mode` or `/mode:inspect`.

Today, mode state is *internal*: it lives in module state in `src/resolver.ts`
and is surfaced only through the `/mode` listing panel (display-only, no
turn), `/mode:inspect` (a diagnostic), and the ephemeral toast that fires when
a mode is set. Between those, the user has no way to remember which mode is
active while typing. The system-prompt transform fires every turn — the user
just can't see which transform is being applied. This feature closes that gap.

The natural surface is `ctx.ui.setStatus("pi-model-modes", <summary>)` —
pi's footer status slot.

The footer also carries a **cycle-keybinding hint** —
`Ctrl+M forward · Shift+Ctrl+M backward` (sourced from the
`CYCLE_FORWARD_KEY` / `CYCLE_BACKWARD_KEY` constants in `src/keybinding.ts`,
so it stays in sync with the registered binding and any user rebind). The
footer is the right home for this hint: it's persistent, so the user sees the
fast path every turn until it's muscle memory, rather than only when they
happen to run the slow `/mode` no-arg path.

## Scope

In scope:
- **Mode indicator.** A pure render helper that formats the effective mode
  into a one-line footer string (mirrors `formatModeSummary` in
  `src/commands.ts`; may share or wrap it).
- **Cycle-keybinding hint.** A short key-hint element sourcing its key names
  from `CYCLE_FORWARD_KEY` / `CYCLE_BACKWARD_KEY` in `src/keybinding.ts`.
- **Update triggers.** A thin pi seam that pushes the formatted footer string
  to `ctx.ui.setStatus` at the moments the effective mode (or identity, if
  shown — see Open questions) can change:
  - `before_agent_start` (per-turn refresh — also covers the cache-miss /
    change-signal path the handler already runs).
  - `session_start` (initial render + post-reseed reconciliation).
  - `model_select` (identity component changes).
  - Inside the `setActiveMode` / `clearActiveMode` paths the `/mode` command
    and the cycle keybinding already invoke, so the footer updates the moment
    a mode is selected rather than waiting for the next turn.
- **Degradation.** No-op when `ctx.hasUI` is false (print/json modes) and a
  graceful `(unresolvable)` marker when the active mode is broken.

Out of scope:
- A status-line *widget* (`ctx.ui.setWidget`) above the editor — the footer
  slot is enough for v1; a richer widget can come later.
- Surfacing the cache key / change-signal last-reason in the footer (that
  detail belongs to `/mode:inspect`).
- Any change to identity injection, resolver tiering, or the cache contract.

## Strategic decisions

None at the vision/spec/architecture layer. The mode state already exists;
this is a presentation surface on top of it. SPEC Invariant 2 (cache
stability) and the no-op-unset contract are untouched — the footer reads
state, it does not join the assembly path.

## Open questions (for feature-design to resolve)

- **Composed axes vs preset name in the footer.** Long form
  (`base:pi • agency:autonomous • quality:architect • scope:unrestricted`) is
  informative but eats footer width; short form (`mode: partner`) is glanceable
  but loses the axes when an explicit-override composition is active. Likely a
  short default with hover/inspect for detail, but the trade-off is a
  feature-design call.
- **Footer layout.** One combined line (`mode: partner  |  ⌘M cycle`) vs two
  slots vs an always-visible hint vs a hint that fades after first use. The
  hint should be discoverable without crowding the indicator.
- **Identity in the footer.** `/mode:inspect` shows the derived identity line;
  the footer probably shouldn't duplicate it (pi already shows the model
  elsewhere in the chrome). Confirm during design.
- **Unset rendering.** Empty slot vs `mode: unset` vs subtle placeholder. When
  mode is unset, the cycle hint arguably matters *more* (the user needs to
  know they can switch) — so the hint may want to persist even when the
  indicator itself is empty.
- **When mode is unresolvable** (broken active mode — `modeError` path in
  `commands.ts`). The footer should degrade to a clear `(unresolvable)` marker
  rather than silently showing stale state.

## Design decisions (resolved during feature-design)

Resolved under the `designer` sub-agent (no user reachable; brief treated as
a sufficient spec). Every claim grounded in pi's verified extension surface
(`ctx.ui.setStatus(key, text|undefined)`, `ctx.hasUI`, and
`on("before_agent_start"|"session_start"|"model_select", …)` all confirmed in
`dist/core/extensions/types.d.ts`; pi's footer render path confirmed in
`dist/modes/interactive/components/footer.js`) and the existing render seams
(`formatModeSummary`, `MODE_LISTING_MESSAGE_TYPE`, the `modeError` degradation
in `src/commands.ts`).

- **Composed axes vs preset name → short glanceable form, three sub-cases.**
  The footer is width-constrained and glanceable; the long
  `base:X • agency:Y • quality:Z • scope:W • +mod` form (already produced by
  `formatModeSummary` for `/mode` no-arg + `/mode:inspect`) is too wide here.
  The footer renders:
  - effective spec is a **string preset name** → `mode: <preset-name>`
    (e.g. `mode: partner`).
  - effective spec is an **explicit non-preset object composition** (no
    name) → compact `mode: <base>/<agency>/<quality>/<scope>`
    (e.g. `mode: pi/autonomous/architect/unrestricted`). Slash-joined;
    distinct density from the long form by design.
  - **modifiers present** → append ` +<count>` (e.g. `mode: refactor +2`)
    as a "there's more here, run /mode:inspect" affordance without bloating
    the line. Modifier NAMES stay in `/mode:inspect`.
  The footer has its own compact formatter (does NOT reuse
  `formatModeSummary`); both share the `ResolvedMode` input so content
  cannot drift, only density.

- **Footer layout → one combined line under one `setStatus` key.** Pi renders
  ALL extension statuses on a single footer line, sorted by key, space-joined,
  and sanitized to one line (`footer.js`: `getExtensionStatuses()` → sort by
  key → `sanitizeStatusText` each → join with space). One key
  (`MODE_FOOTER_KEY = "pi-model-modes"`) gives full layout control within our
  blob and prevents another extension's key from interleaving between our
  indicator and our hint. Internal separator: ` · ` (single spaces, middot) —
  survives `sanitizeStatusText`'s space-collapse. Two-slot / fading-hint
  rejected: two keys lose layout control (pi joins them with a single space,
  sorted); fading needs `setFooter` (custom component), explicitly out of
  scope.

- **Identity in footer → NO.** Pi's chrome already shows the model;
  `/mode:inspect` shows the full identity line. Duplicating it wastes footer
  width. Footer = mode indicator + cycle hint only.
  **Consequence (drop `model_select` from the trigger set):** the footer's
  content depends only on mode state, not model state, so `model_select` is
  NOT a refresh trigger. (If identity is ever added to the footer later, add
  `model_select` then.)

- **Unset rendering + cycle hint persistence → `mode: unset`, hint STAYS.**
  Confirms the user's lean. When the effective mode is unset the footer shows
  `mode: unset` and the cycle hint (if enabled) remains visible — unset is
  precisely when the user most needs to know they can switch. The hint also
  stays visible in the `(unresolvable)` state (the user can cycle AWAY from a
  broken mode).

- **Unresolvable rendering → `mode: (unresolvable)` with NO detail.** The
  footer is width-constrained; the full error message stays in
  `/mode:inspect` (which renders `(unresolvable — <detail>)` via
  `renderModeInspect`). The footer degrades to a bare `(unresolvable)` marker
  so the user knows the active mode is broken and runs `/mode:inspect` or
  `/mode off`. Mirrors the `modeError` pattern from `commands.ts`.

- **Cycle-hint visibility → gated on whether cycle keybindings are
  registered, via a NEW `cycleKeybinding` config flag.** *(This is the one
  scope-broadening call — see Risks.)* Today the factory does NOT call
  `registerModeKeybindings` (SPEC invariant: "No mode-cycle keybinding is
  registered by default"; `src/keybinding.ts` is opt-in-only with NO enabling
  path). Showing the hint unconditionally would advertise a non-functional
  shortcut. Resolution: introduce `cycleKeybinding: boolean` (default
  `false`) in plugin-owned `pi-model-modes.json`. When `true` at factory load
  (read from GLOBAL config only — keybindings register at load before `cwd`
  is known, and keybindings are global in pi anyway), the factory (a) calls
  `registerModeKeybindings(pi)` once and (b) sets a module signal
  `setCycleHintEnabled(true)`. The footer reads the signal; when `false`, the
  hint is omitted (the indicator still renders). This preserves SPEC's "no
  default cycle keybinding" exactly, makes the hint honest, and consolidates
  the opt-in to ONE flag. Rejected alternatives: (a) always-on hint —
  dishonest by default; (b) flip cycle keybindings to default-on —
  contradicts an explicit SPEC decision and the `keybinding-cycle` epic's
  deliberate choice (its Ctrl+M rationale is stale, but reversing the
  decision is a separate product call, out of scope for a footer feature);
  (c) drop the hint — contradicts the brief.

## Architectural choice

**A pure render module + a thin pi seam, mirroring `commands.ts`'s split.**
A new `src/footer.ts` owns:
- `MODE_FOOTER_KEY` — the `setStatus` key (`"pi-model-modes"`).
- `formatModeFooter(inputs)` — PURE render (no pi coupling); returns the
  one-line footer string. Fully unit-testable, like `formatModeSummary` /
  `renderModeInspect`.
- `setCycleHintEnabled(b)` + `resetFooterForTesting()` + an internal
  module-scope flag — the signal the factory sets from the config flag; the
  render reads it. Module-scope state, mirroring `resolver.ts`'s tier state
  and `cache.ts`'s ring.
- `refreshModeFooter(ctx)` — the only pi seam: guards `ctx.hasUI`, reads
  resolver state (`getEffectiveModeSource`, `getActiveMode ?? getDefaultMode`,
  `resolveActiveModePlan`), calls `ctx.ui.setStatus(MODE_FOOTER_KEY,
  formatModeFooter(...))`.

The hint renders the `cycleForwardKey` / `cycleBackwardKey` inputs verbatim
(`CYCLE_FORWARD_KEY` / `CYCLE_BACKWARD_KEY` are already lowercase `+`-joined
KeyId strings — exactly pi's `formatKeyText` display form), so no separate
humanizer is needed; if a future key needs transformation, add a local
helper then (pi's `formatKeyText` is not exported).

**Why this shape over the alternatives:**
- *Fold into `handleBeforeAgentStart`* — rejected. Couples the pure
  transform handler to UI, muddies its by-reference registration contract,
  and risks the footer perturbing the cache-stability invariant. The footer
  is a DISPLAY concern; it gets its own handler.
- *Subscribe to a fine-grained "mode changed" event* — rejected. pi emits no
  such event; mode mutations happen in OUR code (`setActiveMode` /
  `clearActiveMode` / `setDefaultMode`), so WE call `refreshModeFooter` at
  those call sites directly (immediate update) plus register a
  `before_agent_start` + `session_start` safety net.
- *A `setFooter` custom component* — out of scope per the brief (v1: footer
  slot is enough).

**Cache-stability + no-op-unset preservation (the load-bearing constraint).**
The footer is purely a READ of resolver state + a `setStatus` side-effect.
It does NOT touch `e.systemPrompt`, the cache module, the resolver's
set/clear/default paths, or the splice. The transform handler
(`handleBeforeAgentStart`) is byte-unchanged. The footer's
`before_agent_start` handler returns `undefined` (no
`BeforeAgentStartEventResult.systemPrompt`), so it cannot affect the
assembled prompt. SPEC Invariant 2 (cache stability) and the no-op-unset
contract are trivially preserved; a regression assertion is added to the
cache-stability test proving the footer refresh does not change the
assembled prompt across turns.

## Dependencies

None. Reads existing resolver / cache / commands modules; adds a new
presentation module + registration in `extensions/index.ts`.

## Implementation Units

### Unit 1: `src/footer.ts` (new) — pure render + thin seam
**Story**: `feature-mode-footer-indicator-footer-render`

```ts
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ResolvedMode } from "./presets.js";
import {
  getEffectiveModeSource,
  getActiveMode,
  getDefaultMode,
  resolveActiveModePlan,
} from "./resolver.js";
import { CYCLE_FORWARD_KEY, CYCLE_BACKWARD_KEY } from "./keybinding.js";

/** The setStatus key — one slot, full layout control within our blob. */
export const MODE_FOOTER_KEY = "pi-model-modes";

/** PURE inputs to the footer render (no pi coupling). */
export interface ModeFooterInputs {
  source: "override" | "default" | "unset";   // reserved for future footer use; not rendered in v1
  specName: string | undefined;               // effective preset name when string spec
  mode: ResolvedMode | undefined;             // resolved axes (undefined ⇔ unset)
  modeError: string | undefined;              // broken active mode
  cycleHintEnabled: boolean;                  // whether cycle keybindings are registered
  cycleForwardKey: string;                    // CYCLE_FORWARD_KEY (forwarded, not hardcoded)
  cycleBackwardKey: string;                   // CYCLE_BACKWARD_KEY
}

/** PURE: build the one-line footer string. Always returns a string
 *  (never undefined — even unset renders `mode: unset`). */
export function formatModeFooter(inputs: ModeFooterInputs): string {
  /* … see Implementation Notes for precedence … */
}

// Module-scope signal — set once by the factory from the config flag.
let cycleHintEnabled = false;
/** Factory-only: enable/disable the cycle hint (gated on cycleKeybinding config). */
export function setCycleHintEnabled(b: boolean): void { cycleHintEnabled = b; }
/** TEST-ONLY: reset the signal. */
export function resetFooterForTesting(): void { cycleHintEnabled = false; }

/** The only pi seam. Guards ctx.hasUI; reads resolver state; pushes the
 *  formatted footer string to ctx.ui.setStatus. No prompt/cache touch. */
export function refreshModeFooter(ctx: ExtensionContext): void {
  if (!ctx.hasUI) return;                       // no-op in print/json
  const source = getEffectiveModeSource();
  const spec = getActiveMode() ?? getDefaultMode();
  const specName = typeof spec === "string" ? spec : undefined;
  let mode: ResolvedMode | undefined;
  let modeError: string | undefined;
  try { mode = resolveActiveModePlan().mode; }
  catch (err) { modeError = (err as Error).message; }
  ctx.ui.setStatus(
    MODE_FOOTER_KEY,
    formatModeFooter({
      source, specName, mode, modeError,
      cycleHintEnabled,
      cycleForwardKey: CYCLE_FORWARD_KEY,
      cycleBackwardKey: CYCLE_BACKWARD_KEY,
    }),
  );
}
```

**Implementation notes**:
- `formatModeFooter` precedence: `modeError` set → `mode: (unresolvable)`;
  else `mode === undefined` → `mode: unset`; else `specName` present →
  `mode: <specName>`; else compact `mode: <base>/<agency>/<quality>/<scope>`.
  Modifiers (when `mode` is defined) → ` +<n>` suffix. Cycle hint (when
  `cycleHintEnabled`) appended after the indicator in EVERY state:
  ` · <cycleForwardKey>/<cycleBackwardKey> cycle`. The hint appears in preset
  / object / unset / unresolvable states alike (per the design decision).
- `source` is accepted (for symmetry with `formatModeListing`) but NOT
  rendered in v1 (footer stays glanceable; source is in `/mode` no-arg). It's
  in the inputs struct so adding it later is one line.
- `refreshModeFooter` MUST NOT import or touch the cache module, the splice,
  or any set/clear/default setter. Read-only on resolver state.

**Acceptance criteria**:
- [ ] `formatModeFooter` renders `mode: <preset>` for a string preset spec;
  `mode: <base>/<agency>/<quality>/<scope>` for an explicit object spec;
  ` … +<n>` with modifiers; `mode: unset` when unset; `mode: (unresolvable)`
  when `modeError` set (modeError wins over a defined `mode`).
- [ ] When `cycleHintEnabled` is true, the
  ` · <fwd>/<back> cycle` suffix is appended in EVERY state (preset / object
  / unset / unresolvable); when false, no suffix.
- [ ] The hint's key tokens are the passed `cycleForwardKey` / `cycleBackwardKey`
  verbatim — proved by passing synthetic keys (e.g. `"x+y"`) and asserting
  they appear in the output. A constant rename / rebind-source change
  propagates.
- [ ] `refreshModeFooter` is a no-op when `ctx.hasUI` is false (assert it
  does NOT call `ctx.ui.setStatus`).
- [ ] `refreshModeFooter` calls `ctx.ui.setStatus(MODE_FOOTER_KEY, <string>)`
  exactly once when `ctx.hasUI` is true.
- [ ] `refreshModeFooter` does NOT touch the cache module or mutate resolver
  state (assert `getChangeSignal().currentTurn` is unchanged across a call;
  assert `getActiveMode()`/`getDefaultMode()` are unchanged).
- [ ] typecheck clean; `tests/footer.test.ts` green.

---

### Unit 2: cycle-keybinding opt-in (config flag + factory wiring + signal)
**Story**: `feature-mode-footer-indicator-cycle-opt-in`
**Depends on**: `[feature-mode-footer-indicator-footer-render]` (imports
`setCycleHintEnabled` from `src/footer.ts`)

```ts
// src/config.ts (extend)
export interface PluginConfig {
  defaultMode?: string;
  cycleKeybinding?: boolean;   // NEW — gates cycle keybinding + footer hint
}

/** NEW — global-only config read for factory-load-time decisions
 *  (keybindings register at load, before cwd is known). */
export function loadGlobalPluginConfig(): PluginConfig { /* read globalConfigPath() only */ }
```

```ts
// extensions/index.ts (extend the factory)
import { registerModeKeybindings } from "../src/keybinding.js";
import { setCycleHintEnabled } from "../src/footer.js";
import { loadGlobalPluginConfig } from "../src/config.js";

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", handleBeforeAgentStart);
  registerModeCommand(pi);
  registerModeInspectCommand(pi);
  pi.on("session_start", (e, ctx) => applySessionStart(e.reason, ctx.cwd));

  // NEW — opt-in cycle keybindings + footer hint, gated on GLOBAL config flag.
  const { cycleKeybinding } = loadGlobalPluginConfig();
  if (cycleKeybinding === true) {
    registerModeKeybindings(pi);
    setCycleHintEnabled(true);
  }
}
```

**Implementation notes**:
- `loadGlobalPluginConfig` reads ONLY `globalConfigPath()` (refactor
  `loadPluginConfig` to share `readConfigFile`). Project-level
  `cycleKeybinding` is NOT honored — documented (keybindings are global in
  pi; the flag is a global concern).
- `cycleKeybinding` validation: tolerate missing (`false`) and non-boolean
  (`console.warn` + treat as `false`), matching `defaultMode`'s tolerant
  pattern. NEVER throws — the factory must not crash on bad config.
- `registerModeKeybindings` is called exactly once (the factory runs once per
  process). No re-registration concern.
- SPEC/ARCHITECTURE roll-forward: document the `cycleKeybinding` config flag
  in `docs/SPEC.md` (Extension model / Switching paths) and the
  `cycleKeybinding → registers keybinding + enables footer hint` wiring in
  `docs/ARCHITECTURE.md` (Components / extensions/index.ts). The "No
  mode-cycle keybinding is registered by default" invariant is PRESERVED
  (default is still off); the flag is the opt-in.

**Acceptance criteria**:
- [ ] `loadGlobalPluginConfig` reads ONLY the global file (assert via the
  existing `setConfigPathsForTesting` seam that the project file is not
  consulted).
- [ ] `cycleKeybinding` validation: missing → `false`; `true` → `true`;
  non-boolean → `console.warn` + `false`; NEVER throws.
- [ ] Factory: with global `{ "cycleKeybinding": true }`, registers the two
  cycle shortcuts (`ctrl+shift+u`, `ctrl+shift+alt+u`) AND calls
  `setCycleHintEnabled(true)`. With missing/false/non-boolean, registers no
  shortcuts and leaves the hint signal `false`.
- [ ] `registerModeKeybindings` called at most once per process.
- [ ] `registration.test.ts` updated: default → no shortcuts (the existing
  "does not auto-register" property is still asserted — not weakened); flag
  on (via a global config fixture) → two shortcuts + hint signal true.
- [ ] SPEC + ARCHITECTURE updated (rolling foundation).
- [ ] typecheck clean; tests green.

---

### Unit 3: refresh wiring (events + command/keybinding call-sites + harness + regression)
**Story**: `feature-mode-footer-indicator-refresh-wiring`
**Depends on**: `[feature-mode-footer-indicator-footer-render,
feature-mode-footer-indicator-cycle-opt-in]`

```ts
// extensions/index.ts — extend the factory's event handlers (additive to Unit 2)
import { refreshModeFooter } from "../src/footer.js";

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", handleBeforeAgentStart);
  pi.on("before_agent_start", (_e, ctx) => refreshModeFooter(ctx)); // safety net
  registerModeCommand(pi);
  registerModeInspectCommand(pi);
  pi.on("session_start", (e, ctx) => {
    applySessionStart(e.reason, ctx.cwd);
    refreshModeFooter(ctx);                                      // post-reseed
  });
  // … cycle opt-in (Unit 2) …
}
```

```ts
// src/commands.ts — refresh after the /mode <preset> + /mode off mutations
import { refreshModeFooter } from "./footer.js";
// inside registerModeCommand's handler:
//   after setActiveMode(arg) succeeds:  refreshModeFooter(ctx);
//   after clearActiveMode() (off path):  refreshModeFooter(ctx);
// (no-arg listing + unknown-preset error path do NOT mutate → no refresh)
```

```ts
// src/keybinding.ts — refresh after the cycle mutation
import { refreshModeFooter } from "./footer.js";
// inside registerModeKeybindings's cycle handler, after setActiveMode(next):
//   refreshModeFooter(ctx);
// (the "no presets" early-return does not mutate → no refresh)
```

**Implementation notes**:
- The `before_agent_start` footer handler is a SEPARATE registration
  returning `undefined` (no prompt contribution). It runs alongside
  `handleBeforeAgentStart`; order does not matter (the footer reads resolver
  state, which is independent of the transform's cache work).
- `model_select` is deliberately NOT a trigger (footer shows no identity).
- The `/mode` no-arg path (display-only listing) does NOT mutate state → no
  refresh. Only the `<preset>` success path and the `off` path refresh.
- Harness: add a `makeUi(overrides?)` recorder to `tests/harness.ts`
  returning an `ExtensionUIContext`-shaped stub with at least `setStatus`
  (recorded) + `notify` (recorded), so footer + command tests can assert UI
  calls without the fail-fast `makeContext` Proxy biting on `ctx.ui.*`.

**Acceptance criteria**:
- [ ] The factory registers a second `before_agent_start` handler (the
  footer refresh) alongside the transform handler by-reference exactly once.
  `registration.test.ts` updated to allow the second `before_agent_start`
  registration (still asserts the transform handler is registered by
  reference exactly once — not weakened).
- [ ] After `/mode <preset>` the footer updates IMMEDIATELY (command test
  asserts `ctx.ui.setStatus` was called with `MODE_FOOTER_KEY` and the new
  preset in the text, BEFORE any turn fires).
- [ ] After `/mode off` the footer updates immediately (reflects the new
  effective state — default or unset).
- [ ] After a cycle keypress the footer updates immediately (keybinding
  handler test).
- [ ] On `session_start` the footer refreshes AFTER `applySessionStart`
  (post-reseed default reflected). On `before_agent_start` the footer
  refreshes (safety net; idempotent — repeated turns with no state change
  produce the same `setStatus` text).
- [ ] Cache-stability regression: across N no-change turns with a mode set,
  `ctx.getSystemPrompt()` stays byte-identical AND the footer refresh fires
  each turn (assert both). The footer does NOT perturb SPEC Invariant 2.
- [ ] No-op-unset regression: with mode unset, the footer renders
  `mode: unset` (+ hint if enabled) AND the handler's return is the
  identity-only splice unchanged (Invariant 3 preserved).
- [ ] typecheck clean; tests green.

## Implementation Order

1. **Unit 1** (`feature-mode-footer-indicator-footer-render`) — `src/footer.ts`
   pure render + seam + signal. Foundation; no deps.
2. **Unit 2** (`feature-mode-footer-indicator-cycle-opt-in`) — `cycleKeybinding`
   config flag + factory wiring + SPEC/ARCHITECTURE roll-forward. Depends on
   Unit 1 (imports `setCycleHintEnabled`).
3. **Unit 3** (`feature-mode-footer-indicator-refresh-wiring`) — event /
   command / keybinding refresh call-sites + harness + registration +
   cache-stability + no-op regression. Depends on Units 1 + 2.

Linear chain (Unit 2 imports from Unit 1; Unit 3 wires both). Each unit is a
clean, separately-reviewable stride with its own test surface.

## Testing

### Unit tests: `tests/footer.test.ts` (new — Unit 1)
- `formatModeFooter`: preset name / object compact / `+N` modifiers / unset /
  unresolvable (modeError wins over mode); cycle hint appended in every state
  when enabled, absent when disabled; key tokens sourced verbatim from the
  passed `cycleForwardKey`/`cycleBackwardKey` (synthetic-key assertion).
- `refreshModeFooter`: no-op when `ctx.hasUI` false (no `setStatus` call);
  calls `setStatus(MODE_FOOTER_KEY, …)` exactly once when true; does NOT
  advance the cache turn counter or mutate resolver state.

### Unit tests: `tests/config.test.ts` (extend — Unit 2)
- `loadGlobalPluginConfig`: reads only the global file (via
  `setConfigPathsForTesting`); tolerant of missing/non-boolean
  `cycleKeybinding` (warn + false, no throw).

### Registration tests: `tests/registration.test.ts` (extend — Units 2 + 3)
- Default → no shortcuts, hint signal false; flag on → two shortcuts + hint
  signal true; second `before_agent_start` handler (footer refresh) alongside
  the by-reference transform handler.

### Integration tests: `tests/footer-wiring.test.ts` (new — Unit 3)
- `/mode <preset>` → `ctx.ui.setStatus` called with the new preset (immediate,
  pre-turn). `/mode off` → reflects default/unset immediately. Cycle keypress
  → reflects the next preset immediately. `session_start` → refreshes
  post-reseed. `before_agent_start` → refreshes (idempotent across no-change
  turns).

### Regression: `tests/cache-stability.test.ts` + `tests/noop.test.ts` (extend — Unit 3)
- Cache-stability: N no-change turns with a mode set →
  `ctx.getSystemPrompt()` byte-identical AND `ctx.ui.setStatus` fires each
  turn. No-op-unset: mode unset → footer renders `mode: unset` (+ hint if
  enabled) AND the handler's return is the identity-only splice.

## Risks

- **Cycle-hint gating requires a NEW config flag (scope broadening).** The
  brief lists the hint as in-scope, but the cycle keybinding is opt-in-only
  with NO enabling path today (`registerModeKeybindings` is exported but
  nothing calls it; SPEC invariant: "No mode-cycle keybinding is registered
  by default"). Showing the hint unconditionally would advertise a
  non-functional shortcut. Resolution (chosen): introduce
  `cycleKeybinding: boolean` (default false) gating BOTH the registration
  AND the hint — the minimal honest addition that delivers the hint as
  specified. Rejected: always-on hint (dishonest); flip cycle keybindings to
  default-on (contradicts SPEC + the `keybinding-cycle` epic's deliberate
  decision; out of scope); drop the hint (contradicts the brief).

- **User rebind via `~/.pi/agent/keybindings.json` is NOT reflected in the
  hint.** `CYCLE_FORWARD_KEY` / `CYCLE_BACKWARD_KEY` are compile-time
  constants; a user rebind via `keybindings.json` changes what fires but not
  the constant, so the hint shows the originally-registered key. pi exposes
  no API for an extension to introspect the user's resolved keymap (the
  shortcut is registered by KeyId string, not a named `Keybinding` object
  `keyText()` could resolve). The hint therefore reflects the plugin's
  registered default. This is consistent with how most TUIs surface key
  hints sourced from defaults, and honors the user's explicit instruction
  ("key names MUST come from the constants"). A future feature could read
  `keybindings.json` directly if desired.

- **Project-level `cycleKeybinding` is NOT honored.** The flag is read from
  GLOBAL config only at factory load (keybindings register at load, before
  `cwd` is available; keybindings are global in pi anyway). Documented
  limitation; semantically correct (a keybinding toggle is a global concern).

- **Second `before_agent_start` registration.** The footer safety-net
  refresh registers a second `before_agent_start` handler. The current
  `registration.test.ts` asserts exactly one; it must be updated to allow
  two (the transform handler by reference + the footer refresh). Not a
  weakening — the test still asserts the transform handler is registered by
  reference exactly once, and the footer handler is a distinct, named
  function. The cache-stability regression proves the second handler does
  not perturb the prompt.

- **Pi re-renders the footer on every `setStatus`?** (Pre-mortem, lowest
  certainty.) The `before_agent_start` per-turn refresh assumes pi re-renders
  the footer when `setStatus` is called mid-turn. If pi only re-renders on
  specific events, the safety-net refresh may not appear visually (the direct
  post-`setActiveMode`/`clearActiveMode`/cycle calls still produce the
  immediate update, so the feature works regardless). Verify during Unit 3;
  if lag is observed, the `before_agent_start` trigger is safely removable
  without affecting the direct-call triggers.

## Child stories

| Story | Unit | Depends on |
|---|---|---|
| `feature-mode-footer-indicator-footer-render` | 1 — pure render + seam (`src/footer.ts`) | `[]` |
| `feature-mode-footer-indicator-cycle-opt-in` | 2 — `cycleKeybinding` config flag + factory wiring + signal + SPEC/ARCHITECTURE roll-forward | `[footer-render]` |
| `feature-mode-footer-indicator-refresh-wiring` | 3 — event/command/keybinding refresh call-sites + harness + registration/cache-stability/no-op regression | `[footer-render, cycle-opt-in]` |

Linear chain: Unit 1 → Unit 2 → Unit 3.

## Next

`stage: drafting → implementing` complete. Hand off to the `implementor`:
- `/agile-workflow:implement-orchestrator feature-mode-footer-indicator` for
  agent-driven implementation over the dependency graph (Units 1 → 2 → 3), or
- `/agile-workflow:implement feature-mode-footer-indicator-footer-render` then
  `-cycle-opt-in` then `-refresh-wiring` for sequential single-stride passes.
