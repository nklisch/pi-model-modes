---
id: epic-identity-injection-mode-inspect
kind: feature
stage: done
tags: [tests]
parent: epic-identity-injection
depends_on: [epic-identity-injection-cache-and-change-signal, epic-identity-injection-identity-derivation]
release_binding: v0.2.0
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# /mode:inspect Command (reads the change signal)

## Brief

This feature delivers the `/mode:inspect` command, folded into THIS epic per
the epicize decision because it consumes only this epic's change signal (it
does not depend on modes). It renders a plain-text block to the message
stream — mode [minimal/absent for this epic — no mode yet], current identity,
the last-change reason and detail, the turn offset ("N turns ago"), and the
current cache key — reading the change-signal ring buffer's read API plus
deriving the current identity line. The exact rendered shape is
ARCHITECTURE's example block:

```
Mode: flow  (base:chill • agency:autonomous • scope:adjacent • +flow)
Identity: GLM-4.6 (Zhipu AI)
Effective prompt last changed: 3 turns ago — reason: model switched
                                         (zai/glm-4.5 → zai/glm-4.6)
Cache key: 9f3a...c1e2
```

For this epic the `Mode:` line is minimal (no mode selected yet — no axes,
no modifiers); the substantive fields are Identity, last-change reason, and
the cache key. Output is plain text in the message stream (per the epic's
locked design decision — NOT a custom editor-replacing UI overlay for v1).

This feature does NOT cover: the change-signal ring buffer or read API
(cache-and-change-signal), the identity derivation (identity-derivation),
mode/axis/modifier rendering (later epics populate the `Mode:` line), or the
handler (handler-integration). It registers the command in
`extensions/index.ts` (edit, don't overwrite — same co-ownership discipline
as the predecessor) and adds the rendering logic (likely `src/commands.ts`
per ARCHITECTURE's component map).

## Epic context

- Parent epic: `epic-identity-injection`
- Position in epic: **consumer of both foundations, parallel to
  handler-integration and cache-stability-test.** It reads the
  cache-and-change-signal read API (last-change reason/detail, turn offset,
  current key) and derives the current identity via identity-derivation. It
  does not depend on handler-integration (it can surface the current
  identity and last-change reason whether or not the handler has run this
  session) and is not on the critical path. It is the epic's one user-facing
  command surface.

## Foundation references

- `docs/SPEC.md` — "Cache key and the change signal" (the change signal is
  what `/mode:inspect` reads to report *why* the effective prompt last
  changed and *when*).
- `docs/ARCHITECTURE.md` — "Cache and change signal (`src/cache.ts`)" (the
  `/mode:inspect` example output block — the canonical render shape),
  "Components" (`src/commands.ts` as the command module, `extensions/index.ts`
  as the single registration surface).
- `docs/VISION.md` — "What success looks like" (the user can see the
  effective prompt's last-change reason — the observability payoff of the
  change signal).

## Inherited design decisions (from parent epic)

These are locked in the epic's `## Design decisions`; this feature inherits
them and must not re-litigate:

- **`/mode:inspect` output**: plain text rendered to the message stream
  (not a custom editor-replacing UI overlay) for v1; reads the change-signal
  ring buffer; format per ARCHITECTURE's example block.
- **Folded into this epic** (not deferred to a modes epic): the command
  consumes only this epic's change signal, so it belongs here.
- **Identity format**: reuses identity-derivation's `deriveIdentityLine` for
  the `Identity:` field.

<!-- The design pass on this feature (`/agile-workflow:feature-design`) fills
in the command registration (pi's `registerCommand` / command API — verify
the exact surface against `@earendil-works/pi-coding-agent` types), the
plain-text render function, how the minimal no-mode `Mode:` line renders for
v1, the edge case when no turn has run yet (empty ring buffer / no lastResult),
and the test (invokes the command against a stubbed cache read API; asserts
the rendered text matches the canonical shape). -->

## Codex consult requirements (folded in from decomposition review)

- **Unset wording must be precise** (avoid rework when modes land). Identity
  is NOT a mode, so the output must not imply it is. Render `Mode: unset`
  (or `Mode: none`) when no mode is active — NOT `Mode: identity` or anything
  that conflates identity with a mode. Design the `Mode:` line around a
  **mode-summary formatter** that currently returns `unset`/`none` and later
  fills in axes/modifiers when `epic-mode-composition` lands, so this feature
  doesn't need rework.
- The `Identity:` field uses `deriveIdentityLine` (reuses identity-derivation).
  Render it on every inspect call (identity is always active), independent of
  whether a mode is set.

## Design decisions

Resolved under autopilot delegation (scope `--all`); informed by a codex
cross-model design advisory pass (folded in below). Implementation tier for the
implement pass: **OPUS** (claude-opus-4-8).

- **Identity field renders the literal `deriveIdentityLine(model)`** → e.g.
  `Identity: You are GLM-4.6 from Zhipu AI.` The parent epic's inherited
  decision AND this feature's codex-consult note both lock "the `Identity:`
  field uses `deriveIdentityLine`". `docs/ARCHITECTURE.md`'s example block shows
  a conflicting compact form (`Identity: GLM-4.6 (Zhipu AI)`) — that is
  illustrative drift; rolling-foundation requires rolling it forward to the
  locked rendering (Unit 5). Calling `providerDisplayName` directly for a
  compact form would bypass the agreed identity API, not reuse it. (codex point
  1, accepted.)
- **Command name is `"mode:inspect"`** (colon namespacing). pi supports
  colon command names (cf. `skill:name`); the brief/SPEC write `/mode:inspect`.
  Hedged with a registration test asserting the exact registered name. (codex
  point 2, accepted.)
- **Emit via `pi.sendMessage({ customType, content, display: true })` with NO
  `triggerTurn`.** The epic locked "plain text rendered to the message stream
  (not a UI overlay) for v1"; `sendMessage(display:true)` is the faithful
  implementation (confirmed against pi's `file-trigger.ts`, which renders a
  plain string with no custom `MessageRenderer`). `triggerTurn` is omitted so an
  inspect call never provokes a model turn.
- **Known v1 tradeoff — inspect output persists into context.** codex flagged
  (point 4) that a `display:true` custom message is persisted and pi's
  `convertToLlm` later maps custom messages into user-role context, so the
  inspect panel can appear in a subsequent turn's context. This is **accepted
  for v1**: the output is user-invoked, visible, and benign (the model
  occasionally re-seeing its own identity/cache status is harmless). The
  ARCHITECTURE line "the plugin never touches message history" governs *mutating
  existing turns* (which this does not do — it never rewrites prior entries);
  emitting a new user-invoked status message is additive. Flagged here so a
  future epic can switch to an exclude-from-context emit path if pi adds one.
- **No child stories.** One cohesive stride: a pure render module + thin command
  registration + tests, all exercising the same surface. No fan-out, no
  intra-feature dependency chain. The feature IS the implementation unit (same
  call as handler-integration).

## Architectural choice

Mirror handler-integration's split: a **pure, fully-testable render core** plus
a **thin command-registration wrapper**. `src/commands.ts` owns both — the pure
`renderModeInspect(snapshot, model) → string` (no pi coupling, unit-tested
against exact byte shapes) and `registerModeInspectCommand(pi)` (the only pi
seam: reads `getChangeSignal()` + `ctx.model`, renders, calls `pi.sendMessage`).
No new module beyond `src/commands.ts` (ARCHITECTURE's named command module).
Registration is added to `extensions/index.ts` (edit, don't overwrite — the
co-ownership discipline the predecessor established).

## Implementation Units

### Unit 1 (trickiest): `src/commands.ts` — render core + registration

**File**: `src/commands.ts` (new)

```ts
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { Model } from "@earendil-works/pi-ai";
import { deriveIdentityLine } from "./identity.js";
import { getChangeSignal } from "./cache.js";
import type { ChangeSignalSnapshot, ChangeSignalEntry, ChangeReason } from "./cache.js";

/** Slash command name. Colon namespacing is supported by pi (cf. `skill:name`). */
export const MODE_INSPECT_COMMAND = "mode:inspect";
/** `customType` tag for the emitted status message. */
export const MODE_INSPECT_MESSAGE_TYPE = "mode-inspect";

/** Mode summary for the `Mode:` line. v1 has no mode → always "unset".
 *  `epic-mode-composition` replaces the body with axis/modifier rendering. */
export function formatModeSummary(): string {
  return "unset";
}

const REASON_LABEL: Record<ChangeReason, string> = {
  initial: "initial",
  "model-switched": "model switched",
  "mode-switched": "mode switched",
  "base-changed": "base changed",
};

/** Compact first4…last4 of a hex string; short strings shown whole (defensive). */
function shortHex(h: string): string {
  return h.length <= 11 ? h : `${h.slice(0, 4)}...${h.slice(-4)}`;
}

/** Parenthetical detail line for a change entry, or "" when there is nothing
 *  meaningful to show. NEVER renders `undefined → …`. */
function formatChangeDetail(entry: ChangeSignalEntry): string {
  switch (entry.reason) {
    case "initial":
      return ""; // first population — no from-state to show
    case "model-switched": {
      const from = `${entry.detail.modelProvider.from ?? "?"}/${entry.detail.modelId.from ?? "?"}`;
      const to = `${entry.detail.modelProvider.to}/${entry.detail.modelId.to}`;
      return `(${from} → ${to})`;
    }
    case "mode-switched": {
      const from = entry.detail.modeSignature.from || "unset";
      const to = entry.detail.modeSignature.to || "unset";
      return `(${from} → ${to})`;
    }
    case "base-changed": {
      const from = entry.detail.baseHash.from ? shortHex(entry.detail.baseHash.from) : "?";
      return `(base ${from} → ${shortHex(entry.detail.baseHash.to)})`;
    }
  }
}

/** The "Effective prompt last changed: …" block (1 or 2 lines). */
function formatLastChanged(snapshot: ChangeSignalSnapshot): string {
  const last = snapshot.lastEntry;
  if (last === undefined) {
    return "Effective prompt last changed: never (no turn has run yet)";
  }
  const ago = snapshot.currentTurn - last.turn;
  const when = ago <= 0 ? "this turn" : ago === 1 ? "1 turn ago" : `${ago} turns ago`;
  const head = `Effective prompt last changed: ${when} — reason: ${REASON_LABEL[last.reason]}`;
  const detail = formatChangeDetail(last);
  return detail ? `${head}\n  ${detail}` : head;
}

/** PURE: build the plain-text inspect panel. No pi coupling → fully unit-tested. */
export function renderModeInspect(
  snapshot: ChangeSignalSnapshot,
  model: Model<any> | undefined,
): string {
  const identity = model ? deriveIdentityLine(model) : "(no model)";
  const cacheKey = snapshot.currentKey ? shortHex(snapshot.currentKey) : "(none)";
  return [
    `Mode: ${formatModeSummary()}`,
    `Identity: ${identity}`,
    formatLastChanged(snapshot),
    `Cache key: ${cacheKey}`,
  ].join("\n");
}

/** The only pi seam: register `/mode:inspect`. Reads the change signal + the
 *  live model, renders, and emits a display-only message (no `triggerTurn`). */
export function registerModeInspectCommand(pi: ExtensionAPI): void {
  pi.registerCommand(MODE_INSPECT_COMMAND, {
    description:
      "Show the effective prompt's identity, last-change reason, and cache key",
    handler: async (_args: string, ctx: ExtensionCommandContext): Promise<void> => {
      const content = renderModeInspect(getChangeSignal(), ctx.model);
      pi.sendMessage({
        customType: MODE_INSPECT_MESSAGE_TYPE,
        content,
        display: true,
      });
    },
  });
}
```

**Implementation notes**:
- `getChangeSignal()` is a pure read — it does NOT advance the turn counter
  (only `getCachedResult` does), so invoking `/mode:inspect` never perturbs
  `currentTurn`. "N turns ago" is therefore relative to the last real
  `before_agent_start` turn.
- Detail second line uses a 2-space indent (cosmetic; tests assert the detail
  substring, not exact column alignment — ARCHITECTURE's wide alignment is
  illustrative).
- `(no model)` is the identity fallback when `ctx.model` is undefined (mirrors
  the handler's undefined-model tolerance; `deriveIdentityLine` needs a model).

### Unit 2: `extensions/index.ts` — register the command (edit, don't overwrite)

```ts
import { registerModeInspectCommand } from "../src/commands.js";
// ... existing imports ...

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", handleBeforeAgentStart);
  registerModeInspectCommand(pi);
}
```

Update the entry doc-comment's Registrations list to add the `/mode:inspect`
command line.

### Unit 3: `tests/harness.ts` — record `sendMessage` in `makePi`

`makePi` currently records `on / registerTool / registerCommand /
registerShortcut / registerFlag / registerMessageRenderer / registerProvider`.
Add `sendMessage: record("sendMessage")` so the emission test can assert the
inspect handler called it with the right args (and with no `triggerTurn`
option). Purely additive — no existing test depends on its absence.

### Unit 4: `tests/commands.test.ts` — render core + registration/emission

**File**: `tests/commands.test.ts` (new). `beforeEach(resetCacheForTesting)`.

Pure `renderModeInspect` cases:
- **model-switched** canonical shape: drive the cache (two `handleBeforeAgentStart`
  turns with different models, or direct `setCachedResult`) so `lastEntry.reason
  === "model-switched"`; assert the 4 lines incl. `Identity: You are … from ….`
  and the `(provider/id → provider/id)` detail.
- **initial**: one populate → reason `initial`, NO parenthetical, NO
  `undefined → …` anywhere.
- **empty ring / `currentTurn 0`**: fresh reset → "never (no turn has run yet)"
  and `Cache key: (none)`.
- **`currentKey` undefined** → `Cache key: (none)`.
- **no model** (`renderModeInspect(snap, undefined)`) → `Identity: (no model)`.
- **turn wording**: `this turn` (ago 0), `1 turn ago` (ago 1), `N turns ago`.
- **`shortHex`**: 64-char hex → `abcd...wxyz`; short (<12) string → whole.
- **base-changed** detail: `(base <4>...<4> → <4>...<4>)`.

Registration + emission (via `makePi`):
- `registerModeInspectCommand(pi)` → assert exactly one `registerCommand` call
  whose name is `"mode:inspect"` with a `description` and a `handler`.
- Extract the recorded handler; populate the cache with one
  `handleBeforeAgentStart` turn (seam test: handler populates → inspect reads);
  invoke `await handler("", makeContext({ model }))`; assert a `sendMessage` call
  was recorded with `customType === "mode-inspect"`, `display === true`, `content`
  containing the identity line and `Cache key:`, AND that the options arg carried
  no `triggerTurn` (informational, must not provoke a turn).

### Unit 5: `docs/ARCHITECTURE.md` — roll the example block forward

The example block (≈line 132) shows `Identity: GLM-4.6 (Zhipu AI)`, which
contradicts the locked decision to render the literal `deriveIdentityLine`.
Roll that line forward to `Identity: You are GLM-4.6 from Zhipu AI.` so the
canonical render shape matches the implemented v1 (rolling-foundation: the doc
must not depict a rendering the code deliberately doesn't produce). The
`Mode: flow (…)` line stays — it illustrates the eventual composed Mode line a
later epic delivers; v1 renders `Mode: unset`.

## Implementation Order

1. **Unit 3** (harness `sendMessage` recording) — the emission test needs it.
2. **Unit 1** (`src/commands.ts`) — the render core + registration; typecheck.
3. **Unit 2** (`extensions/index.ts`) — wire the command in.
4. **Unit 4** (`tests/commands.test.ts`) — render + registration/emission; run
   the full suite.
5. **Unit 5** (`docs/ARCHITECTURE.md`) — roll the example forward after code is
   green.

A single OPUS implementor stride lands all five; no orchestration (no fan-out).

## Testing

- **Pure core**: `renderModeInspect` is the bulk of the surface and is tested
  byte-exactly across reasons + edges (above). Because it's pure, no pi stubbing
  is needed for those.
- **Seam**: the emission test drives `handleBeforeAgentStart` once, then invokes
  the inspect handler — proving the cache read API + identity derivation compose
  correctly behind the command (the first time `commands.ts` meets `cache.ts` +
  `identity.ts`).
- **Module-state isolation**: `beforeEach(() => resetCacheForTesting())` — the
  change signal is module-scope stateful.

## Risks

- **`registerCommand("mode:inspect")` colon support** is verified by reasoning
  (pi uses colon commands) but not yet by a live pi run. Mitigation: the
  registration test pins the exact name; if a live pi rejects the colon, the
  fallback is `"mode-inspect"` (one-line change, tests updated). Low risk.
- **Context-leak of inspect output** (documented above as an accepted v1
  tradeoff). Not a correctness risk; a cleanliness one. Revisit if pi exposes an
  exclude-from-context emit path.
- **Detail-line alignment** is cosmetic and intentionally not asserted to exact
  columns — keeps the tests robust against trivial spacing changes.

## Other agent review

A codex cross-model design advisory pass (peeragent, `--effort high`) ran on the
draft. Accepted and folded in: (1) render the literal `deriveIdentityLine` and
roll the ARCHITECTURE example forward; (2) `"mode:inspect"` colon name is safe,
hedged with a registration test; (3) per-reason detail mapping that never emits
`undefined → …` and omits the parenthetical on `initial`; (4) the documented
`display:true` context-leak tradeoff (accepted for v1 with rationale); (5) the
expanded test matrix (initial, empty ring, absent key, non-64 key truncation,
singular/plural turn wording, per-reason detail, no-`triggerTurn` emission, and
`makePi` recording `sendMessage`). No advisory points were rejected. Overall
codex take: "proceed with `mode:inspect`, literal `deriveIdentityLine`, and a
clearly documented context-leak decision before implementation."

## Implementation notes

Landed all five units exactly per the design body (OPUS implementor stride, no
fan-out).

**What landed:**
- **Unit 3** — `tests/harness.ts`: added `sendMessage: record("sendMessage")` to
  `makePi`'s recorded methods (additive; existing methods untouched).
- **Unit 1** — `src/commands.ts` (new): `MODE_INSPECT_COMMAND="mode:inspect"`,
  `MODE_INSPECT_MESSAGE_TYPE="mode-inspect"`, `formatModeSummary()` (→ `"unset"`),
  the `shortHex`/`formatChangeDetail`/`formatLastChanged` helpers, the pure
  `renderModeInspect(snapshot, model)`, and the `registerModeInspectCommand(pi)`
  seam (reads `getChangeSignal()` + `ctx.model`, renders, `pi.sendMessage({
  customType, content, display:true })` with NO `triggerTurn`). Verbatim from the
  design; `.js` ESM import extensions.
- **Unit 2** — `extensions/index.ts`: imported `registerModeInspectCommand` and
  called it after `pi.on("before_agent_start", handleBeforeAgentStart)`; updated
  the entry doc-comment Registrations list to add `/mode:inspect`.
- **Unit 4** — `tests/commands.test.ts` (new): full render matrix
  (model-switched canonical 4-line shape with literal `deriveIdentityLine` and
  `(provider/id → provider/id)` detail; initial with no parenthetical and no
  `undefined`; empty ring "never" + `(none)`; `currentKey` undefined → `(none)`;
  no-model → `(no model)`; this turn / 1 turn ago / N turns ago wording; shortHex
  64-char truncation + short-whole; base-changed detail; mode-switched
  `(unset → flow)`), plus the registration assertion (exactly one
  `registerCommand` named `"mode:inspect"`) and the emission seam (one real
  `handleBeforeAgentStart` turn → extracted handler → `sendMessage` with
  `customType "mode-inspect"`, `display:true`, content containing the identity
  line + `Cache key:`, and no `triggerTurn`). `beforeEach(resetCacheForTesting)`.
- **Unit 5** — `docs/ARCHITECTURE.md`: rolled the example block
  `Identity: GLM-4.6 (Zhipu AI)` → `Identity: You are GLM-4.6 from Zhipu AI.`
  (the locked `deriveIdentityLine` rendering). Left `Mode: flow (...)` as the
  future-state illustration.

**Deviation (logged):** The pre-existing `tests/registration.test.ts` asserted
the factory "registers nothing else" beyond the `before_agent_start` handler.
Wiring `/mode:inspect` makes that assertion false by design, so it was updated
(not gamed) into two `it`s: the handler-by-reference assertion is unchanged, and
a new assertion verifies exactly one `registerCommand` named `"mode:inspect"`
and nothing beyond the handler `on` + that command. This is the contract roll-
forward the design's co-ownership discipline implies; the test still proves the
single registration surface.

**API verification:** Confirmed against
`node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts`:
`registerCommand(name: string, Omit<RegisteredCommand,"name"|"sourceInfo">)`
accepts the colon name (`name` is `string`, no validation in the type);
`sendMessage(message, options?)` returns `void` (not a Promise — the handler does
not await it); `ExtensionCommandContext extends ExtensionContext` carries
`.model`. No design-flaw escape hatch needed — the colon command name and
`sendMessage` signature both hold.

**Verification:** `npm run typecheck` clean; `npm test` green — 92 tests across
8 files (was 72 across 7; added `tests/commands.test.ts` with 19 cases and split
`registration.test.ts` from 1 into 2 cases).

## Review record

**Verdict: Approve** — deep lane (feature), fresh-context evaluation, following a
cross-model codex implementation review that approved with doc/test nits (all
applied).

Fresh-context reviewer (opus, did not write the code) verified every criterion
PASS: Mode `unset` for v1; Identity renders the literal `deriveIdentityLine`
with `(no model)` fallback; "N turns ago" math + this turn/1 turn ago/N turns ago
wording; empty ring → "never"; absent key → "(none)"; `shortHex` first4...last4
with short-string defense; `formatChangeDetail` never emits `undefined →` and
omits the parenthetical on `initial`; command name exactly `"mode:inspect"`;
`sendMessage` customType `mode-inspect`, `display:true`, NO `triggerTurn` (option
AND not smuggled in the message object); `getChangeSignal` proven a pure read
(inspect does not advance the turn counter). `registration.test.ts` still
constrains "exactly handler + one command, nothing else". No gamed assertions.
typecheck clean; 8 files / 92 tests green. No findings above nit. Advanced
review → done.
