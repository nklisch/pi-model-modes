---
id: epic-switching-paths-config-default
kind: feature
stage: review
tags: []
parent: epic-switching-paths
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Config Default + Effective-Mode State (override > default > unset)

## Brief

This is the **foundation** feature of switching-paths: it establishes the
plugin-owned config and the **effective-mode state layer** the command and
keybinding features build on. Per the epic's locked decision, config is
plugin-owned (NOT pi's closed `Settings`): the plugin reads
`~/.pi/agent/pi-model-modes.json` (global) and `.pi/pi-model-modes.json`
(project, overrides global), merging them, for `{ defaultMode, ... }`.

Critically (per the codex decomposition advisory): the engine's resolver today
has a SINGLE `activeSpec`. Seeding the default through `setActiveMode(default)`
would make the default indistinguishable from a session override, so `/mode off`
could not fall back correctly. This feature therefore introduces a real
**default/override seam** so the effective mode is `override ?? default ?? unset`
— distinct `default` and `override` tiers, with the resolver's existing
active-mode seam representing the *effective* selection. It seeds the default at
`session_start`, and exposes an effective-mode source (override / default /
unset) the `/mode` no-arg display, the keybinding cycle start, and the
`/mode:inspect` preset-name line consume.

This feature OWNS rolling `docs/SPEC.md` + `docs/ARCHITECTURE.md` forward: the
"Switching paths" SPEC section assumed a `mode` key in `settings.json`; pi's
`Settings` type is closed (no plugin namespace), so plugin-owned config
supersedes it (rolling-foundation — docs describe current truth).

This feature does NOT implement `/mode` (mode-command) or the keybinding
(keybinding-cycle); it provides the config + precedence + effective-mode state
they manipulate.

## Epic context
- Parent epic: `epic-switching-paths`
- Position: **foundation — no deps; mode-command + keybinding-cycle depend on it.**

## Foundation references
- `docs/SPEC.md` — "Switching paths" (precedence + persistence; this feature rolls
  the settings.json assumption forward to plugin-owned config).
- `docs/ARCHITECTURE.md` — "Components" (`src/resolver.ts`; a small config/mode-state
  module), "Per-turn data flow" (step 1: resolve active mode).
- `src/resolver.ts` (landed) — the active-mode seam this layers over.

## Inherited / epic design decisions (do not re-litigate)
- **Plugin-owned config** (`~/.pi/agent/pi-model-modes.json` + project), merged;
  supersedes the SPEC settings.json assumption — roll SPEC + ARCHITECTURE forward.
- **Precedence**: session override (`/mode`) > config default > unset. Override is
  ephemeral (module state); default is durable (config). New session restarts from
  the default.
- **Effective-mode state layer** (codex advisory): distinct default vs override so
  `/mode off` falls back to the default, not to unset. Expose the effective spec +
  its source.

## Design decisions (resolved during feature-design)

Resolved under autopilot (scope `--all`). Implementation tier: OPUS. The decisive
architecture (default/override tiers) was set by the epic's codex decomposition
advisory; grounded against pi's APIs below. Cross-model advisory at IMPLEMENTATION
review.

- **Two-tier mode state in the resolver** (codex). `src/resolver.ts` gains a
  `defaultSpec` tier alongside the existing active spec (now the **override**).
  Effective = `override ?? default ?? unset`. `resolveActiveModePlan()` resolves
  the effective spec; `setActiveMode`/`getActiveMode`/`clearActiveMode` keep their
  meaning as the OVERRIDE API (existing tests pass unchanged — override-only →
  effective = override). New: `setDefaultMode(spec)` (validated like the override),
  `getDefaultMode()`, `clearDefaultMode()`, `getEffectiveModeSource(): "override" |
  "default" | "unset"`. `resetResolverForTesting()` clears BOTH tiers. So
  `/mode off` = `clearActiveMode()` → effective falls back to the default (not unset).
- **Plugin-owned config** (`src/config.ts`). `loadPluginConfig(cwd)` reads global
  `~/.pi/agent/pi-model-modes.json` (`join(homedir(), ".pi", "agent", ...)`) and
  project `<cwd>/.pi/pi-model-modes.json`, JSON-parses each (missing → `{}`;
  malformed → warn + `{}`, never crash), and **shallow-merges project over global**
  → `{ defaultMode?: string }` (v1 shape; extensible). A test seam overrides the
  two file paths (or injects JSON) so tests don't touch the real home dir.
- **Session-start seeding.** `applyDefaultFromConfig(cwd)` loads the config and, if
  `defaultMode` is present, `setDefaultMode(defaultMode)` — wrapped so an INVALID
  default (unknown preset / missing fragment) warns and is skipped rather than
  crashing `session_start`. Registered via `pi.on("session_start", (e, ctx) =>
  applyDefaultFromConfig(ctx.cwd))` in `extensions/index.ts` (edit, don't overwrite).
- **Docs roll-forward (OWNED here).** `docs/SPEC.md` "Switching paths" assumed a
  `mode` key in `settings.json`; pi's `Settings` is closed (no plugin namespace —
  verified). Roll SPEC + ARCHITECTURE forward to plugin-owned config
  (`pi-model-modes.json`, global + project merge) and the override>default>unset
  precedence. (mode-command owns command-output docs; keybinding owns the Ctrl+M
  note — not this feature.)
- **No child stories** — one cohesive foundation (resolver tier extension + config
  module + session wiring + docs + tests).

## Architectural choice
Extend the existing `resolver.ts` with the default tier (keeps mode resolution in
one module; no circular dep) + a new pure `config.ts` (file read/merge, no pi
coupling beyond `cwd`) + a thin `session_start` registration. The config module is
the only new file; the resolver change is additive (existing override API intact).

## Implementation Units

### Unit 1: `src/resolver.ts` — add the default tier
- Add `let defaultSpec: ModeSpec | undefined;` beside the existing override spec.
- `export function setDefaultMode(spec: ModeSpec | undefined): void` — same
  validate-by-materialize-before-assign + clone-on-set as `setActiveMode`.
- `export function getDefaultMode(): ModeSpec | undefined` — clone object specs
  (like `getActiveMode`).
- `export function clearDefaultMode(): void`.
- `export function getEffectiveModeSource(): "override" | "default" | "unset"` —
  override present → "override"; else default present → "default"; else "unset".
- `resolveActiveModePlan()` — resolve `const spec = <override> ?? defaultSpec`; if
  `undefined` → the no-mode fast-path; else `materializePlan(normalize(spec))`.
- `resetResolverForTesting()` — clear override AND default.
- Update the module JSDoc to describe the two tiers + precedence.

### Unit 2: `src/config.ts` (new)
```ts
export interface PluginConfig { defaultMode?: string; }
export function loadPluginConfig(cwd: string): PluginConfig; // global+project merge, tolerant
export function applyDefaultFromConfig(cwd: string): void;   // setDefaultMode(config.defaultMode) if valid; warn+skip on bad
// test seam: setConfigPathsForTesting({ global?, project? }) / resetConfigForTesting()
```
Notes: read with `readFileSync`+`JSON.parse` in try/catch (ENOENT → `{}`; parse
error → `console.warn` + `{}`). Merge shallow, project precedence. `applyDefault`
wraps `setDefaultMode` in try/catch (invalid default → `console.warn`, no throw).

### Unit 3: `extensions/index.ts` — session_start registration
`pi.on("session_start", (_e, ctx) => applyDefaultFromConfig(ctx.cwd));` (additive).

### Unit 4: `docs/SPEC.md` + `docs/ARCHITECTURE.md` roll-forward
SPEC "Switching paths": config default lives in plugin-owned `pi-model-modes.json`
(global `~/.pi/agent/` + project `.pi/`, merged), NOT `settings.json`; precedence
override>default>unset; override ephemeral, default durable. ARCHITECTURE
"Components": add `src/config.ts`; note the two-tier resolver state.

### Unit 5: tests
- `tests/resolver-tiers.test.ts` (or extend resolver.test): override ?? default
  precedence; `getEffectiveModeSource`; `clearActiveMode` falls back to default;
  `clearDefaultMode`; reset clears both; a bad default throws at setDefaultMode.
- `tests/config.test.ts`: global-only, project-only, project-overrides-global,
  missing files → `{}`, malformed → warn + `{}`; `applyDefaultFromConfig` seeds a
  valid default and skips+warns an invalid one (no throw). Use the config test seam.

## Acceptance criteria
- [ ] Effective mode = override ?? default ?? unset; `resolveActiveModePlan()`
  reflects it; existing override-only tests pass unchanged.
- [ ] `clearActiveMode()` (= `/mode off`) falls back to the config default.
- [ ] `getEffectiveModeSource()` returns override/default/unset correctly.
- [ ] Config global+project merge (project wins); missing/malformed tolerated
  (warn, no crash); `applyDefaultFromConfig` seeds a valid default, warns+skips a
  bad one.
- [ ] SPEC + ARCHITECTURE rolled forward to plugin-owned config + precedence.
- [ ] typecheck clean; full suite green.

## Risks
- **Resolver API churn** (LOW): the change is additive; the override API keeps its
  names + semantics, so handler-wiring + existing tests are unaffected.
- **Global config touches `~`** (mitigated): the config test seam overrides both
  paths so tests never read/write the real home dir.
- **session_start `reason`** ("startup"/"reload"/"new"/"resume"/"fork"): seed on all
  reasons (the default should apply to every fresh/resumed session) — simplest and
  correct; no reason-gating for v1.

## Implementation notes

Landed all 5 units exactly per the design.

- **Unit 1 — `src/resolver.ts` (additive two-tier state).** Added
  `let defaultSpec: ModeSpec | undefined` beside the existing `activeSpec`
  (the OVERRIDE). New exports: `setDefaultMode` (validate-by-materialize-before-assign
  + clone-on-set, mirroring `setActiveMode`), `getDefaultMode` (clone-on-read),
  `clearDefaultMode`, `getEffectiveModeSource()` (override→"override", else
  default→"default", else "unset"). `resolveActiveModePlan()` now resolves
  `const spec = activeSpec ?? defaultSpec` → no-mode fast-path if undefined, else
  `materializePlan(normalize(spec))`. `resetResolverForTesting()` clears BOTH
  tiers. `setActiveMode`/`getActiveMode`/`clearActiveMode` keep their names +
  semantics as the OVERRIDE API (override-only ⇒ effective = override), so the
  existing `tests/resolver.test.ts` passes unchanged. Module JSDoc updated to
  describe the two tiers + precedence.
- **Unit 2 — `src/config.ts` (new).** `PluginConfig { defaultMode? }`;
  `loadPluginConfig(cwd)` reads global `~/.pi/agent/pi-model-modes.json` +
  project `<cwd>/.pi/pi-model-modes.json` via `readFileSync`+`JSON.parse` in
  try/catch (ENOENT → `{}`; parse error / non-object → `console.warn` + `{}`),
  shallow-merging project over global. `applyDefaultFromConfig(cwd)` seeds the
  default tier via `setDefaultMode` wrapped in try/catch (invalid default →
  `console.warn`, no throw — `session_start` can never crash). Test seam:
  `setConfigPathsForTesting({ global?, project? })` + `resetConfigForTesting()`.
  node: builtins throughout.
- **Unit 3 — `extensions/index.ts`.** Added
  `pi.on("session_start", (_e, ctx) => applyDefaultFromConfig(ctx.cwd))`
  (additive, alongside the existing handler + command). Doc-comment updated.
  Grounded against pi's types: the `on("session_start", …)` overload and
  `ExtensionContext.cwd` both exist.
- **Unit 4 — docs roll-forward.** SPEC "Switching paths" now describes the
  plugin-owned `pi-model-modes.json` (global `~/.pi/agent` + project `.pi`,
  merged, project wins), NOT `settings.json`; the two-tier override>default>unset
  precedence with `/mode off` falling back to the default; the Extension-model
  bullet now names the `session_start` config-seed. ARCHITECTURE "Components"
  adds `src/config.ts` + a two-tier-state note; the test listing adds
  `config.test.ts` / `resolver-tiers.test.ts` (and the pre-existing
  `resolver.test.ts`).
- **Unit 5 — tests.** `tests/resolver-tiers.test.ts` (effective-mode source;
  override ?? default precedence; `clearActiveMode` falls back to default;
  clone/clear/reset of the default tier; bad default throws at `setDefaultMode`
  with state intact). `tests/config.test.ts` (global-only / project-only /
  project-overrides-global / both-missing→{} / malformed→warn+{} / array→warn+{};
  `applyDefaultFromConfig` seeds a valid default, no-ops absent `defaultMode`,
  warns+skips an invalid default without throwing — via the path seam + temp
  files + a fragment fixture).

**Registration test update (necessary, in-scope):** `tests/registration.test.ts`
asserted exactly one `pi.on` registration as the "single registration surface"
contract. Unit 3 legitimately adds the `session_start` `on` call, so the test was
rolled forward: it now asserts `before_agent_start` is registered once by
reference AND `session_start` is registered once (added coverage, not weakened),
and the `on` event set is exactly `[before_agent_start, session_start]`.

**Verification.** `npm run typecheck` clean. `npm test` → **197 passed** (16
files), up from 178 (added 19 across the two new test files). The pre-existing
`tests/resolver.test.ts` (override-only seam) passes unchanged. No real bugs
surfaced; no design deviations.
