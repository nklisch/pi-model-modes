---
id: feature-configurable-writing-styles
kind: feature
stage: review
tags: [security, tests, docs]
parent: null
depends_on: []
release_binding: null
gate_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Configurable writing styles

## Brief

Add an optional writing-style layer that controls how the agent communicates without changing how a mode approaches the work. A single selected style applies across every mode; presets continue to own only behavioral concerns such as agency, quality, scope, and modifiers.

The style selection is configured through the existing plugin-owned global/project configuration, with project selection overriding global selection and an absent selection injecting nothing. Users can choose one of four bundled styles or register named Markdown files for their own styles. Custom style content must participate in the same deterministic assembly and cache invalidation guarantees as bundled fragments.

This separates communication posture from task posture. Switching from `debug` to `create`, for example, should not unexpectedly change how terse or explanatory the agent is. Conversely, changing the writing style should not alter autonomy, implementation quality, or edit scope.

## Strategic decisions

- **Selection model:** One style applies across every mode. Styles are not preset fields and are not selected per mode.
- **Configuration precedence:** Style selection follows the plugin's existing project-over-global configuration model. This is independent of mode override/default precedence.
- **Optional by default:** No style is selected on fresh installs, preserving current prompt bytes and behavior until the user opts in.
- **Custom styles:** Global and project config can register names that resolve to user-authored Markdown files. The design must resolve relative paths from the defining config file and prevent a project config from reading arbitrary sensitive files into the system prompt.
- **Initial built-ins:** Ship `clear`, `compact`, `explanatory`, and `expressive`.
- **Behavioral boundary:** Writing styles govern user-facing prose only. Code-comment policy, documentation creation, implementation scope, and tool-use policy remain outside the style fragments.

## Initial style direction

### `clear`

An improved version of the existing `../claude-code-modes/prompts/base/text-output.md` posture:

- Lead with the answer, result, or immediate plan.
- Keep progress visible with one-sentence updates at meaningful milestones, not a narration of every tool call.
- Write complete sentences that make sense to a reader joining cold; avoid unexplained shorthand.
- Match detail to the task. Simple questions need direct answers; substantive work gets enough structure to communicate decisions, verification, and remaining risk.
- Do not expose internal deliberation. State conclusions and the reasons useful to the user.
- Close with outcome, verification, and next step when those are relevant; do not force a formal summary onto a trivial response.

Compared with the source style, this removes unrelated rules about code comments and planning documents and relaxes the rigid “one or two sentences, nothing else” closing rule so important verification is not lost.

### `compact`

Answer-first, minimal prose:

- Use the shortest complete response that preserves important decisions, failures, and verification.
- Skip preamble, restatement, and routine progress updates.
- Prefer short paragraphs or bullets when they improve scanning.
- Surface blockers and changed direction immediately.

### `explanatory`

Shared-understanding prose:

- Lead with the recommendation or conclusion, then explain why.
- Include relevant context, trade-offs, and a concrete example when it reduces ambiguity.
- Distinguish verified facts from inferences and unresolved questions.
- Use headings and diagrams only when the material earns them.
- Explain decisions without narrating private chain-of-thought.

### `expressive`

Warm, vivid, technically precise prose:

- Use active voice, concrete language, varied sentence rhythm, and restrained personality.
- Use analogy or metaphor only when it makes a technical idea clearer.
- Allow a dry aside or moment of delight when it fits the work.
- Avoid forced jokes, ornamental prose, emojis, and personality that competes with the answer.

## Scope

In scope:

- A dedicated optional writing-style fragment slot, independent of `ResolvedMode`.
- Bundled fragments for the four initial styles.
- Config keys for selecting a style and registering named custom style files at global/project scope.
- Strict boundary validation for style names, config shape, file extension, and safe path resolution.
- Deterministic assembly and cache-key coverage for style selection and style content changes.
- Style injection when a style is configured, including when no mode is active; no configured style preserves the current mode-unset bytes exactly.
- User-facing documentation and inspectability sufficient to identify the effective style and its source.
- Tests for config precedence, custom file safety, assembly order, cache stability/invalidation, and mode-unset compatibility.

Out of scope:

- Per-preset or per-mode style selection.
- Multiple simultaneously selected styles.
- Inline style prose inside JSON configuration.
- A style editor or other graphical configuration UI.
- Moving existing behavioral modifiers such as `playful` or `speak-plain` into the style catalog in this feature.

## Open questions for feature design

- Choose final config key names and define whether named-style maps merge by key across global/project scope or project scope replaces the global map wholesale.
- Define the safest useful custom-file policy, including containment, symlink handling, and whether global config may reference files outside its own directory.
- Place the style fragment relative to mode modifiers. A global baseline before modifiers would let task-specific modifiers specialize communication where necessary.
- Decide whether v1 is config-only or gains a `/style` inspection/selection command; avoid overloading the `/mode` command with an independent concern.
- Decide how `/mode:inspect` and the footer surface the effective style without implying it is part of the mode preset.
- Reconcile overlap with `speak-plain` and `playful` while preserving existing preset behavior.

## Dependencies

None. The feature extends the existing config, fragment-loading, prompt-assembly, and cache seams but does not require either active presentation feature to finish first.

## Design decisions

Resolved during feature-design (brief treated as a sufficient spec; every
decision grounded in the verified code seams above). Each bullet maps to one of
the "Open questions" above.

- **Config key names + `customStyles` merge semantics.** Two new top-level keys
  in `pi-model-modes.json` (camelCase, matching `defaultMode`/`cycleKeybinding`):
  - `writingStyle: string` — the effective selection. `"none"` is a virtual
    explicit-no-style value (masks a global selection, mirrors `NONE_PRESET`);
    absent/`undefined` means "no selection". Values are validated against the
    known style catalog at seed.
  - `customStyles: Record<string, string>>` — name → relative path map.
  - **Merge:** `customStyles` is per-key merged across scopes (project entry
    wins on key collision, including over a bundled name when explicitly
    registered); the top-level scalars (`writingStyle`, `defaultMode`,
    `cycleKeybinding`) stay shallow-merged project-over-global exactly as today.
  - Rationale: per-key merge lets a project add or override individual styles
    without redeclaring the global map, while the existing scalar semantics
    ("project wins outright") are preserved unchanged. `"none"` gives a project
    the one-line escape hatch to mask an unwanted global style.

- **Custom-file policy (containment, symlinks, global-out-of-dir).** A single,
  uniform, auditable rule applied to BOTH scopes:
  - Paths MUST be **relative** (absolute → rejected, clear error).
  - Resolved against **`dirname(<defining-config-file>)`** — so a project entry
    resolves under `<cwd>/.pi/` and a global entry under `~/.pi/agent/`.
  - MUST end in **`.md`**.
  - **Containment via `realpath`**: `realpathSync(candidate)` must equal or sit
    under `realpathSync(configDir)` (strict `root + sep` prefix). Symlinks
    whose realpath escapes the root are rejected; in-dir symlinks to in-dir
    targets are accepted.
  - MUST be a **regular file** (`statSync().isFile()`).
  - **Re-validated every turn** (TOCTOU defense — see Architectural choice) so a
    mid-session symlink swap cannot later exfiltrate a file that passed seed.
  - **Global config may NOT reference files outside its own directory.** A user
    wanting cross-project shared styles copies the file into `~/.pi/agent/styles/`
    for v1; a future feature can add an explicit opt-in escape if needed.
  - Rationale: the project-config exfiltration threat (`<cwd>/.pi/pi-model-modes.json`
    checked into a cloned repo pointing at `~/.ssh/id_rsa` or `/etc/passwd`) is
    the highest-stakes surface here per `CONVENTIONS.md`. One rule, defended
    twice (seed + per-turn), is the minimum defensible posture.

- **Style-name validation.** Custom-style names (the `customStyles` keys) MUST
  match `^[a-z][a-z0-9-]*$`. The four bundled names satisfy it. Bad keys are
  skipped with a warn at seed (one bad entry does not poison the whole map).
  Rationale: Fail Fast at the config boundary; the name never becomes a path
  (the value does), but a strict pattern keeps names filesystem-safe, sort
  deterministically, and rejects accidental `"../x"`-shaped keys.

- **Style fragment position vs. modifiers.** The style fragment sits **after
  the identity line and BEFORE the mode composition**
  (`[identity] [style?] [base?] [agency] [quality] [scope] [modifiers…] [pi base]`).
  Rationale: a writing style is a global prose baseline; placing it ahead of the
  mode lets task-specific modifiers (which trail in the splice) specialize or
  override communication via recency — exactly "a global baseline before
  modifiers so task-specific modifiers can specialize communication." Modifiers
  like `speak-plain` / `playful` thus compose with, rather than fight, the style.

- **v1 surface — config-only (NO `/style` command).** No `/style` command, no
  config writer for styles, no autocomplete changes. Selection is edited
  directly in `pi-model-modes.json`; inspectability is via `/mode:inspect`
  (see next). Rationale: selection is slow-changing and config-edit-friendly;
  a third command family + an ephemeral override tier (mirroring
  override>default>unset for modes) is scope bloat for v1. A `/style` command is
  a clean future feature that can layer an override tier on the same resolver.

- **`/mode:inspect` + footer surfacing (without implying style is a preset
  field).**
  - `/mode:inspect` gains a **dedicated `Style:` line**, structurally separate
    from the `Mode:` line. Rendering: `Style: <name> (<source>)` /
    `Style: none (explicit)` / `Style: (unset)` / `Style: (unresolvable — <err>)`.
    The change-signal gains a `style-switched` reason with its own detail line.
  - The **`/mode` no-arg listing does NOT gain a style line** — that panel is
    the mode-switching affordance; mixing style in would imply coupling.
  - The **footer does NOT gain style** — it is width-constrained and
    mode-glanceable; identity is already omitted there for the same reason.
  - Rationale: the brief requires inspectability of the effective style and
    source; `/mode:inspect` is the "what is effective right now" diagnostic and
    the natural home. Keeping style out of the switching panel and footer
    preserves "styles are not preset fields."

- **`speak-plain` / `playful` overlap.** Both stay as modifiers — they are
  load-bearing in shipped presets (`partner` uses `speak-plain`; `tinker` and
  `spark` use `playful`) and migrating them would change preset behavior,
  violating "preserves existing preset behavior." A selected style composes
  with them; the modifier (later in the splice) refines the style on conflict.
  Document the coexistence; reconciliation (if it ever proves confusing) is out
  of scope and would be its own feature.

- **Cache key.** Add `styleSignature` as a **6th key component**
  (`NO_STYLE_SIGNATURE = ""` mirrors `NO_MODE_SIGNATURE`). Add a new change
  reason `style-switched` with classification priority
  `initial > model-switched > mode-switched > style-switched > base-changed`
  (both mode and style are deliberate user/config actions; mode is more central
  and reported first when both change in one turn). Rationale: folding style
  into `modeSignature` would mislabel style edits as "mode switched" in
  `/mode:inspect`; a separate component keeps the diagnostic honest.

- **No-style byte compatibility.** When **no style is selected AND no mode is
  active**, the splice is byte-identical to today's legacy form
  (`identity ? identity + "\n" + base : base` — single `\n`). When a style IS
  active (regardless of mode), the splice uses the blank-line join
  (`\n\n`) — the user has opted in, so changing the join is expected.
  Rationale: "absent selection injects nothing … preserving current prompt bytes
  and behavior until the user opts in" is the load-bearing compatibility
  promise and is enforced by an exact-bytes regression.

## Architectural choice

**A new pure `src/style.ts` module owns style semantics, orthogonal to
`src/resolver.ts` (modes); the handler resolves BOTH per turn and they are
independent inputs to the cache key and the splice. Reuse `loadFragment`'s
mtime cache for both bundled and custom style content; put the path-containment
logic in one pure helper called twice (seed + per turn).**

- `src/style.ts` (new) — style state, `resolveActiveStylePlan()`, bundled
  discovery, the security-critical `resolveCustomStylePath()` (pure), the
  signature, and a no-style plan. Mirrors `resolver.ts`'s shape (module-scope
  state + `resetForTesting` per the `stateful-module-reset-for-testing` pattern).
- `src/config.ts` (extend) — reads per-scope raw style config
  (`readStyleConfigScopes`) and orchestrates seeding
  (`applyStyleFromConfig` → calls `setStyleSelection` in style.ts). The existing
  `applySessionStart` gains exactly one tolerant `applyStyleFromConfig(cwd)`
  call. Dependency direction is one-way (`config.ts → style.ts`); `style.ts`
  never imports `config.ts` (it reads only its own module state), so there is no
  import cycle.
- `loadFragment` (existing, path-agnostic in its cache) is reused for both
  bundled and custom files. Because it `statSync`s every call and re-reads only
  on `mtimeMs` change, **editing a custom `.md` invalidates the cache the next
  turn for free** — the per-turn `stylePlan.signature = sha256(content)`
  changes → the cache key changes → re-assemble. This is deterministic
  **content-hash** invalidation, not mtime-based (a bare `touch` that leaves
  content identical does NOT invalidate).
- **Path containment is defended twice**: `resolveCustomStylePath` runs at seed
  (inside `applyStyleFromConfig`, so a bad entry is warned + dropped before it
  ever reaches the resolver) AND inside `resolveActiveStylePlan` every turn
  (TOCTOU defense — closes the symlink-swap window between seed and read). Same
  pure function, two call sites.
- **Pi seams stay thin.** No new pi registrations: no new command, no new event
  handler, no keybinding, no autocomplete. `extensions/index.ts` is unchanged
  (the already-wired `session_start` handler picks up styles because
  `applySessionStart` now also seeds style). Footer is unchanged. The only
  user-visible additions are the inspect `Style:` line and the new
  `style-switched` reason. Pure-render additions only, per the
  `pure-core-thin-pi-seam` pattern.

**Rejected alternatives:**

- *Fold style into `ModePlan` / `resolver.ts`.* Style is orthogonal to mode
  ("one style across every mode"); nesting it in the mode resolver muddies the
  mode contract and the `ModePlan` type, and forces every mode test to carry
  style fixtures. A sibling module keeps each concern testable in isolation.
- *Read config every turn.* Two `readFileSync` calls per turn for no benefit —
  config-shape edits are session-scoped (a reload picks them up, matching how
  `defaultMode` already works). Content edits (the hot path) are already live
  via `loadFragment`'s mtime cache.
- *A `/style` command + override tier.* Scope bloat for v1; deferred (see above).
- *Hardcode the four bundled names.* Convention discovery (`prompts/styles/*.md`)
  mirrors `discoverModifiers` and lets future bundled styles land without code
  changes; name resolution is bundled-first-then-custom (custom wins on
  collision, so a user can override a bundled style they dislike).

## Implementation Units

### Unit 1: Bundled style fragments — `prompts/styles/{clear,compact,explanatory,expressive}.md` (new)

Four Markdown files under a new `prompts/styles/` directory, authoring the
style direction recorded at the top of this item. Each is a single short brief
(heading + paragraph + optional bullets), scoped to **user-facing prose only**
— deliberately silent on code-comment policy, doc creation, implementation
scope, and tool use (the behavioral boundary from the brief).

- `prompts/styles/clear.md` — the improved `text-output.md` posture (answer-first,
  complete sentences, progress at meaningful milestones, no forced formal
  summary on trivial responses). Drops the source's code-comment/planning rules.
- `prompts/styles/compact.md` — answer-first minimal prose.
- `prompts/styles/explanatory.md` — recommendation-then-why, verified-vs-inference.
- `prompts/styles/expressive.md` — warm/vivid/precise, analogy only when it
  clarifies, no emojis or forced personality.

**Implementation notes**:
- Ship under `prompts/` so they are already covered by the `"files": ["prompts/"]`
  allowlist in `package.json` — no manifest change needed.
- The directory doubles as the bundled-catalog source for `discoverBundledStyles()`
  (Unit 2), mirroring `prompts/modifiers/`.
- File naming matches the catalog names (`clear` ↔ `clear.md`), so resolution is
  basename-sans-`.md` — identical to axes/modifiers.

**Acceptance criteria**:
- [ ] Four files exist; each trims to non-empty content; each stays within the
  prose-voice behavioral boundary (no code-comment / scope / tool-use rules).
- [ ] No file changes byte-for-byte once authored (cache-stability precondition).

---

### Unit 2: `src/style.ts` (new) — resolver, path security, signature, state

The pure core of the feature. Owns style semantics with no pi coupling.

```ts
import { createHash } from "node:crypto";
import { realpathSync, statSync } from "node:fs";
import { resolve, sep, isAbsolute, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import { loadFragment, setFragmentRootForTesting } from "./fragments.js";
// NO import from "./config.js" — style.ts reads only its own module state.

/** No-style sentinel for the cache-key contribution (mirrors NO_MODE_SIGNATURE). */
export const NO_STYLE_SIGNATURE = "";

/** A registered custom style: its raw relative path + the config dir to resolve
 *  against + which scope it came from (for the inspect source line). */
export interface CustomStyleEntry {
  rawRel: string;
  configDir: string;          // absolute dir of the defining config file
  scope: "global" | "project";
}

/** The seeded selection: effective name + the merged custom registry. Set once
 *  per session by config.ts's applyStyleFromConfig. */
export interface StyleSelection {
  selection: string | undefined;                 // undefined ⇔ unset; "none" ⇔ explicit no-style
  registry: ReadonlyMap<string, CustomStyleEntry>; // per-key merged, project wins
}

/** The materialized per-turn plan (mirrors the ModePlan shape for symmetry). */
export interface StylePlan {
  name: string | undefined;                       // undefined ⇔ no style (unset/none)
  source: "bundled" | "custom-global" | "custom-project" | "none" | "unset";
  content: string;                                // "" when no style
  signature: string;                              // NO_STYLE_SIGNATURE when no style
}

const STYLE_NAME_RE = /^[a-z][a-z0-9-]*$/;
export function isValidStyleName(name: string): boolean { return STYLE_NAME_RE.test(name); }

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** SECURITY-CRITICAL pure resolver — see Custom-file policy above. THROWS a
 *  specific error on every failure mode. Called at seed (config.ts) AND per
 *  turn (resolveActiveStylePlan) — single implementation, double defense. */
export function resolveCustomStylePath(rawRel: string, configDir: string): string {
  if (typeof rawRel !== "string" || rawRel.length === 0)
    throw new Error("custom style path is empty");
  if (isAbsolute(rawRel))
    throw new Error(`custom style path must be relative (got absolute): "${rawRel}"`);
  if (!rawRel.endsWith(".md"))
    throw new Error(`custom style path must end in ".md": "${rawRel}"`);
  const rootReal = realpathSync(configDir);
  const candidate = resolve(rootReal, rawRel);
  let targetReal: string;
  try { targetReal = realpathSync(candidate); }
  catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error(`custom style file not found: "${rawRel}" (resolved ${candidate})`);
    throw cause;
  }
  if (targetReal !== rootReal && !targetReal.startsWith(rootReal + sep))
    throw new Error(`custom style path escapes its config directory: "${rawRel}" (resolved ${targetReal})`);
  if (!statSync(targetReal).isFile())
    throw new Error(`custom style path is not a regular file: "${rawRel}"`);
  return targetReal;
}

/** Bundled `.md` paths in prompts/styles/, filename-sorted (mirrors
 *  discoverModifiers). FAIL FAST on missing dir; empty dir → []. */
export function discoverBundledStyles(): string[] { /* readdir prompts/styles, filter .md, sort */ }

// --- module-scope state (mutable; reset for tests) ---
let styleSelection: StyleSelection | undefined;

/** Seed hook (called by config.ts's applyStyleFromConfig). */
export function setStyleSelection(sel: StyleSelection | undefined): void {
  styleSelection = sel;
}

function noStylePlan(source: "none" | "unset"): StylePlan {
  return { name: undefined, source, content: "", signature: NO_STYLE_SIGNATURE };
}

/** Per-turn materialization. Reads module state. THROWS when a custom file
 *  vanished or its containment broke since seed (TOCTOU) — the handler wraps
 *  this in try/catch and degrades (resolver-throw-graceful-degrade pattern). */
export function resolveActiveStylePlan(): StylePlan {
  const sel = styleSelection;
  if (sel === undefined || sel.selection === undefined) return noStylePlan("unset");
  if (sel.selection === "none") return noStylePlan("none");

  // Custom wins on name collision; then bundled.
  const custom = sel.registry.get(sel.selection);
  if (custom) {
    const realPath = resolveCustomStylePath(custom.rawRel, custom.configDir); // re-validate (TOCTOU)
    const content = loadFragment(realPath);                                   // mtime-cached
    return { name: sel.selection, source: custom.scope === "global" ? "custom-global" : "custom-project", content, signature: sha256(content) };
  }
  const bundled = discoverBundledStyles().find((p) => basename(p, ".md") === sel.selection);
  if (bundled) {
    const content = loadFragment(bundled);
    return { name: sel.selection, source: "bundled", content, signature: sha256(content) };
  }
  throw new Error(`style "${sel.selection}" has no bundled or custom fragment`);
}

/** TEST-ONLY: clear style state. */
export function resetStyleForTesting(): void { styleSelection = undefined; }
```

**Implementation notes**:
- `loadFragment` is imported from `fragments.js` and is path-agnostic in its
  cache (keyed by absolute path), so it serves both bundled and custom files
  without change. Its `statSync`-per-call + re-read-on-mtime means **content
  edits invalidate the next turn**; **a bare `touch` does not** (the signature
  hashes content, not mtime).
- The registry stores `rawRel + configDir` (NOT a pre-resolved path) so
  `resolveActiveStylePlan` can re-run `resolveCustomStylePath` every turn —
  closing the symlink-swap TOCTOU window between seed and read.
- `resolveActiveStylePlan` mirrors `resolveActiveModePlan`'s contract: pure
  read of module state, throws on unresolvable, fast-paths the no-style case
  with zero discovery work.
- Custom-wins-on-collision is a deliberate feature (lets a user override a
  bundled style name); the per-key merge that builds the registry happens in
  Unit 3.

**Acceptance criteria**:
- [ ] `resolveCustomStylePath` accepts a relative `.md` under the config dir;
  rejects absolute paths, non-`.md`, missing files, non-regular files,
  `..` escapes, and symlinks whose realpath escapes the config dir (each with
  a distinct error message). In-dir symlinks to in-dir targets are accepted.
- [ ] `discoverBundledStyles()` returns the four bundled paths, sorted.
- [ ] `resolveActiveStylePlan()` returns the no-style plan (`source: "unset"`)
  when no selection; the `none` plan (`source: "none"`) for `"none"`; the
  bundled/custom plan otherwise. Custom-wins on name collision with bundled.
- [ ] Editing a custom file's content changes `signature`; a no-op `touch`
  (same content) does not. (Covered jointly with Unit 5's cache test.)
- [ ] `isValidStyleName` accepts `clear`/`my-team-voice`; rejects `../x`,
  `Bad Name`, `UPPER`, empty.
- [ ] typecheck clean; `tests/style.test.ts` green.

---

### Unit 3: `src/config.ts` (extend) — style config read + seed + session_start wiring

```ts
// PluginConfig gains two optional keys.
export interface PluginConfig {
  defaultMode?: string;
  cycleKeybinding?: boolean;
  writingStyle?: string;                       // NEW
  customStyles?: Record<string, string>;       // NEW (name → relative path)
}

/** Per-scope raw style data, each field shape-validated (tolerant: bad entries
 *  skipped with a warn, never thrown). configDir is the realpath-able dir of
 *  the defining config file. */
export interface StyleConfigScope {
  configDir: string;
  writingStyle: string | undefined;
  customStyles: Record<string, string>;        // validated names → rawRel
}

export function readStyleConfigScopes(cwd: string): {
  global: StyleConfigScope;
  project: StyleConfigScope;
} { /* read each scope's file via the existing readConfigFile; dirname() the
      config path; shape-validate customStyles entries (string values, valid
      name keys) dropping bad ones with a warn. */ }

/** Reconcile style state to the CURRENT merged config. Tolerant + never throws:
 *  build the per-key-merged custom registry (project wins on key collision,
 *  each entry carrying its own configDir + scope), resolve effective selection
 *  (project scalar ?? global scalar ?? undefined), then setStyleSelection().
 *  Validation errors at seed (bad custom path, unknown selection name) → warn
 *  and degrade the offending piece (drop the entry / treat selection as unset);
 *  session_start can never crash from a bad style config. */
export function applyStyleFromConfig(cwd: string): void {
  const { global, project } = readStyleConfigScopes(cwd);
  // Per-key merge with source tracking. validate each custom path via
  // resolveCustomStylePath (Fail Fast at seed); drop + warn on failure.
  const registry = new Map<string, CustomStyleEntry>();
  for (const [name, rawRel] of Object.entries(global.customStyles))
    if (isValidStyleName(name)) tryAdd(registry, name, rawRel, global.configDir, "global");
  for (const [name, rawRel] of Object.entries(project.customStyles))
    if (isValidStyleName(name)) tryAdd(registry, name, rawRel, project.configDir, "project");
  // Effective selection: project scalar wins (incl. "none"), else global.
  const selection = project.writingStyle ?? global.writingStyle;
  // If a selection names something not in registry AND not bundled AND not "none",
  // warn + treat as unset (don't seed a selection that can't resolve).
  if (selection !== undefined && selection !== "none" && !isKnownStyle(selection, registry)) {
    console.warn(`pi-model-modes: unknown writingStyle "${selection}" — ignoring`);
    setStyleSelection({ selection: undefined, registry });
    return;
  }
  setStyleSelection({ selection, registry });
}

// applySessionStart gains exactly ONE tolerant call (config.ts → style.ts):
export function applySessionStart(reason: SessionStartReason, cwd: string): void {
  if (reason === "new" || reason === "resume" || reason === "fork") clearActiveMode();
  applyDefaultFromConfig(cwd);
  applyStyleFromConfig(cwd);                    // NEW — never throws
}
```

**Implementation notes**:
- `loadPluginConfig`'s merge is deepened ONLY for `customStyles` (per-key,
  project wins); top-level scalars stay shallow. Implemented as
  `{ ...global, ...project, customStyles: { ...global.customStyles, ...project.customStyles } }`
  in `loadPluginConfig`. Existing scalar consumers (`effectiveDefaultSource`,
  `writeDefaultToConfig`'s reseed) read only `defaultMode` and are unaffected.
- `applyStyleFromConfig` resolves the effective selection's known-ness against
  the bundled catalog too (`isKnownStyle` consults `discoverBundledStyles`),
  so a `writingStyle: "clear"` with no custom registry is accepted at seed.
- The `writeDefaultToConfig` writer already preserves sibling keys generically
  (`{ ...loaded }` then mutate `defaultMode`), so `writingStyle` and
  `customStyles` survive a `/mode default …` write with no change there.
- One-way dependency: `config.ts` imports `setStyleSelection`,
  `resolveCustomStylePath`, `isValidStyleName`, `discoverBundledStyles` from
  `style.ts`; `style.ts` imports nothing from `config.ts` (no cycle).

**Acceptance criteria**:
- [ ] `loadPluginConfig` per-key-merges `customStyles` (project entry wins on
  collision) while scalars stay shallow-merged (covered by an extended
  `tests/config.test.ts`).
- [ ] `readStyleConfigScopes` tolerates missing/malformed files (→ empty scope,
  warn on malformed); `configDir` is `dirname` of each scope's path.
- [ ] `applyStyleFromConfig`: valid config seeds `setStyleSelection`; unknown
  selection name → warn + unset; bad custom path → entry dropped + warn,
  sibling entries still seed; NEVER throws.
- [ ] `applySessionStart` calls `applyStyleFromConfig(cwd)` after
  `applyDefaultFromConfig(cwd)` on every reason (startup/reload/new/resume/fork).
- [ ] typecheck clean; `tests/config.test.ts` (extended) green.

---

### Unit 4: `src/cache.ts` (extend) — `styleSignature` + `style-switched` reason

```ts
export const NO_STYLE_SIGNATURE = "";           // NEW (mirrors NO_MODE_SIGNATURE)

export interface CacheKeyInputs {
  modelName: string;
  modelId: string;
  modelProvider: string;
  modeSignature: string;
  styleSignature: string;                       // NEW (6th component)
  baseSystemPrompt: string;
}

export type ChangeReason =
  | "initial" | "model-switched" | "mode-switched"
  | "style-switched"                            // NEW
  | "base-changed";
// classifyReason priority: initial > model > mode > style > base.
```

**Implementation notes**:
- `KeyComponents`, `componentsOf`, `encodeComponents`, and `ChangeSignalEntry.detail`
  each gain a `styleSignature` field threaded through in the same length-delimited
  canonical form. `classifyReason` adds the `style-switched` branch between
  `mode-switched` and `base-changed`.
- `REASON_LABEL` (in commands.ts, Unit 6) maps `"style-switched" → "style switched"`.
- Adding a 6th component changes every existing cache key — that is fine: the
  per-turn cache is in-memory and per-session, so the first turn after upgrade
  is a single MISS and re-assemble. No cross-version continuity concern.

**Acceptance criteria**:
- [ ] `computeCacheKey` includes `styleSignature`; two inputs differing only in
  `styleSignature` produce different keys (extended `tests/cache.test.ts`).
- [ ] `classifyReason` returns `style-switched` when only `styleSignature`
  changed; `mode-switched` wins when both mode and style changed in one turn.
- [ ] `getChangeSignal().entries[].detail.styleSignature` carries `{from, to}`.
- [ ] typecheck clean; `tests/cache.test.ts` (extended) green.

---

### Unit 5: `src/assemble.ts` + `src/handler.ts` (extend) — splice, byte-compat, degrade

```ts
// assemble.ts — add an OPTIONAL trailing styleFragment (backward-compatible:
// existing mode-only callers stay valid; style leads the fragment list).
export function assembleSystemPrompt(
  identity: string,
  plan: ModePlan,
  baseSystemPrompt: string,
  styleFragment?: string,                       // NEW (optional, prepended after identity)
): string {
  const parts: string[] = [];
  if (identity.length > 0) parts.push(identity);
  if (styleFragment !== undefined && styleFragment.length > 0) parts.push(styleFragment);
  for (const f of plan.fragments) if (f.content.length > 0) parts.push(f.content);
  if (baseSystemPrompt.length > 0) parts.push(baseSystemPrompt);
  return parts.join("\n\n");
}
```

```ts
// handler.ts — resolve BOTH plans per turn; style is wrapped in try/catch
// (graceful degrade); the no-style + no-mode branch preserves legacy bytes.
function spliceSystemPrompt(
  identity: string,
  stylePlan: StylePlan,
  plan: ModePlan,
  baseSystemPrompt: string,
): string {
  const noStyle = stylePlan.content === "";
  const noMode = plan.mode === undefined;
  if (noStyle && noMode) {
    // Legacy byte-identical no-op form (Invariant 3) — single \n join.
    return identity ? `${identity}\n${baseSystemPrompt}` : baseSystemPrompt;
  }
  return assembleSystemPrompt(identity, plan, baseSystemPrompt, noStyle ? undefined : stylePlan.content);
}

export function handleBeforeAgentStart(e, ctx): RequiredBeforeAgentStartResult {
  lastBaseSystemPrompt = e.systemPrompt;

  const plan = resolveActiveModePlan();        // existing (unwrapped, as today)

  let stylePlan: StylePlan;
  try { stylePlan = resolveActiveStylePlan(); }   // NEW — wrapped (style is optional;
  catch (err) {                                    // a vanished custom file must not
    stylePlan = noStylePlanFromError(err);         // kill every subsequent turn)
    console.warn(`pi-model-modes: style unresolvable — degrading to no-style (${(err as Error).message})`);
  }

  const inputs: CacheKeyInputs = {
    modelName: model?.name ?? "", modelId: model?.id ?? "", modelProvider: model?.provider ?? "",
    modeSignature: plan.signature,
    styleSignature: stylePlan.signature,        // NEW
    baseSystemPrompt: e.systemPrompt,
  };
  const key = computeCacheKey(inputs);
  const cached = getCachedResult(key);
  if (cached !== undefined) return { systemPrompt: cached };

  const identity = model ? deriveIdentityLine(model) : "";
  const result = spliceSystemPrompt(identity, stylePlan, plan, e.systemPrompt);
  setCachedResult(key, result, inputs);
  return { systemPrompt: result };
}

// assembleForInspect (the /mode:inspect --prompt path) resolves style too,
// so the debug view and the live turn cannot drift.
export function assembleForInspect(model, baseSystemPrompt): string {
  const plan = resolveActiveModePlan();
  let stylePlan: StylePlan;
  try { stylePlan = resolveActiveStylePlan(); }
  catch (err) { stylePlan = noStylePlanFromError(err); }
  const identity = model ? deriveIdentityLine(model) : "";
  return spliceSystemPrompt(identity, stylePlan, plan, baseSystemPrompt);
}
```

**Implementation notes**:
- **Byte compatibility is a branch, not a coincidence:** `spliceSystemPrompt`
  takes the legacy single-`\n` path IFF `noStyle && noMode`. Any style (even
  with no mode) flips to the blank-line join — the user has opted in. The
  no-style + no-mode bytes are asserted exactly against the legacy form in the
  regression test.
- **Style degradation is asymmetric with mode on purpose.** `resolveModePlan`
  stays unwrapped today (pre-existing behavior — a vanished mode fragment
  throws and pi surfaces it). Style IS wrapped because a vanished CUSTOM file
  is far more likely (user-authored, deletable) and the style feature is
  optional — one bad path must not brick every turn. The degrade is cached
  under the no-style key, so restoring the file reactivates the style on the
  next key-changing event (mirrors how vanished mode fragments already behave
  via the same cache). Noted inconsistency, not in scope to retrofit onto mode.
- The `assembleSystemPrompt` 4th param is **optional + trailing** so
  `tests/assemble.test.ts` and the mode-only inspect path keep working
  unchanged; only the handler and the new tests pass it.

**Acceptance criteria**:
- [ ] **No-style byte compat:** with no style + no mode, the handler's return
  is byte-identical to today (`identity + "\n" + base`); `noop.test.ts` and
  `cache-stability.test.ts` assertions still pass without modification of the
  bytes (only the style-reset in `beforeEach` is added).
- [ ] **Style + no mode:** style fragment is spliced (blank-line join) even
  when no mode is active — the style injects independently.
- [ ] **Style + mode:** order is `[identity] [style] [base?] [agency] [quality]
  [scope] [modifiers…] [pi base]` (assertable via sentinel content per slot).
- [ ] **Graceful degrade:** if `resolveActiveStylePlan()` throws (simulated by
  deleting a seeded custom file mid-test), the handler still returns a valid
  `{ systemPrompt }` with identity + mode + base and NO style fragment, and
  warns once.
- [ ] **Cache stability with style:** across N no-change turns with a style
  active, `ctx.getSystemPrompt()` is byte-identical (HIT path). Changing the
  style content (edit the custom file) forces a MISS and re-assemble on the
  next turn; a `touch` that leaves content identical does NOT force a MISS.
- [ ] **`/mode:inspect --prompt`** includes the style fragment (via
  `assembleForInspect`) — same bytes as the live turn for the same inputs.
- [ ] typecheck clean; new + extended handler/cache tests green.

---

### Unit 6: `src/commands.ts` (extend) — inspect `Style:` line + reason rendering

```ts
export interface StyleInspectInfo {
  name: string | undefined;        // undefined ⇔ no style
  source: "bundled" | "custom-global" | "custom-project" | "none" | "unset";
  error: string | undefined;       // when resolveActiveStylePlan threw
}

const REASON_LABEL["style-switched"] = "style switched";   // extend the existing map

// formatChangeDetail adds a style-switched case:
//   `style-switched` → `(style <shortHex(from) | "unset"> → <shortHex(to) | "unset">)`

function formatStyleLine(info: StyleInspectInfo): string {
  if (info.error) return `Style: (unresolvable — ${info.error})`;
  switch (info.source) {
    case "unset":          return "Style: (unset)";
    case "none":           return "Style: none (explicit)";
    case "bundled":        return `Style: ${info.name} (bundled)`;
    case "custom-global":  return `Style: ${info.name} (custom, global)`;
    case "custom-project": return `Style: ${info.name} (custom, project)`;
  }
}

// renderModeInspect signature gains styleInfo (positional, between modeError
// and assembledPrompt). The Style: line is emitted after Mode: and before
// Identity:, keeping it visually grouped with the other effective-state lines.
export function renderModeInspect(
  snapshot, model, mode, modeError?, styleInfo?: StyleInspectInfo, assembledPrompt?: string,
): string

// registerModeInspectCommand resolves styleInfo alongside mode (same try/catch
// graceful-degrade pattern commands.ts already uses for mode) and passes it in.
```

**Implementation notes**:
- The `Style:` line is a peer of `Mode:` / `Identity:` — never nested — so it
  reads as an orthogonal layer, not a preset field.
- `formatModeListing` (the `/mode` no-arg panel) is **unchanged** — no style
  line there (Design decisions).
- `footer.ts` is **unchanged** — no style in the footer.

**Acceptance criteria**:
- [ ] `/mode:inspect` emits a `Style:` line for every state (bundled / custom-
  global / custom-project / none / unset / unresolvable); source labels match
  the merged-registry outcome.
- [ ] A style edit shows up in the change-signal block as
  `reason: style switched` with `(style <from> → <to>)` detail.
- [ ] `formatModeListing` and `formatModeFooter` outputs are byte-unchanged
  (no style leakage into the switching panel or footer).
- [ ] typecheck clean; `tests/commands.test.ts` (extended) green.

---

### Unit 7: Documentation roll-forward (rolling foundation)

- **`docs/SPEC.md`** — add a "Writing styles" section (selection model,
  config keys, four built-ins + custom files + containment rule, no-style byte
  compat, injection when mode unset, behavioral boundary). Update Invariant 3
  to state byte-identity holds when "no mode AND no style." Update the cache-key
  formula to include `styleSignature`. Update the assembly-order diagram to
  show `[style?]` between identity and the mode composition.
- **`docs/ARCHITECTURE.md`** — add `src/style.ts` and `prompts/styles/` to the
  component tree; add a style-resolution step to the per-turn data flow; note
  the TOCTOU double-defense on custom paths.
- **`docs/VISION.md`** — one-line note that an orthogonal style layer now
  composes with modes (prose posture vs. task posture).
- **`README.md`** — document the two new config keys with examples (selecting a
  built-in; registering a custom style; the `none` mask) and the containment
  rule for custom files.
- **`CHANGELOG.md`** — Features entry under the next version.

**Acceptance criteria**:
- [ ] SPEC Invariant 3 + cache-key formula + assembly diagram updated and
  consistent with the implementation.
- [ ] README contains a working `pi-model-modes.json` example for built-in +
  custom + `none`.
- [ ] CHANGELOG entry added.

## Implementation Order

Linear, single-owner (rationale in **Child stories** below):

1. **Unit 1** — author the four `prompts/styles/*.md` (gives the resolver
   something to discover).
2. **Unit 2** — `src/style.ts` (resolver + path security + signature + state +
   discovery). Foundation; no deps.
3. **Unit 3** — `src/config.ts` extensions (`PluginConfig` keys,
   `readStyleConfigScopes`, `applyStyleFromConfig`, `loadPluginConfig`
   per-key merge, `applySessionStart` wiring). Depends on Unit 2.
4. **Unit 4** — `src/cache.ts` (`styleSignature`, `style-switched`). No deps on
   2/3 (parallelizable in principle, but small — kept in sequence).
5. **Unit 5** — `src/assemble.ts` + `src/handler.ts` (splice + byte-compat +
   graceful degrade + `assembleForInspect`). Depends on 2 + 4.
6. **Unit 6** — `src/commands.ts` inspect Style line + reason rendering.
   Depends on 2 + 4 + 5.
7. **Unit 7** — docs roll-forward. Last, so it documents what shipped.

## Testing

### Unit tests: `tests/style.test.ts` (new — Units 2)
- `resolveCustomStylePath`: accepts relative `.md` under config dir; rejects
  absolute, non-`.md`, missing, non-regular, `..` escapes, escaping symlinks;
  accepts in-dir symlinks to in-dir targets (temp-fixture-test-scaffold pattern).
- `discoverBundledStyles()`: returns the four shipped paths, sorted.
- `resolveActiveStylePlan()`: no-style/`none`/bundled/custom plans; custom-wins
  on collision; throws on vanished custom file (degrades upstream).
- `isValidStyleName`: accepts/rejects per the regex.
- Signature stability: identical content → identical signature; mutated
  content → different signature.

### Unit tests: `tests/config.test.ts` (extend — Unit 3)
- `loadPluginConfig` per-key-merges `customStyles`; scalars stay shallow.
- `readStyleConfigScopes`: per-scope reads + `configDir = dirname(path)`;
  tolerates missing/malformed.
- `applyStyleFromConfig`: valid seeds; unknown selection → warn + unset; bad
  custom path → entry dropped + warn, siblings retained; never throws.
- `applySessionStart` calls `applyStyleFromConfig` on every reason.

### Unit tests: `tests/cache.test.ts` (extend — Unit 4)
- `styleSignature` participates in `computeCacheKey`; `style-switched`
  classification + `detail.styleSignature` populated.

### Integration + regression: `tests/handler-style.test.ts` (new — Unit 5)
- No-style + no-mode → byte-identical to legacy (`noop.test.ts` shape).
- Style + no-mode → style splices (blank-line join).
- Style + mode → exact splice order via per-slot sentinels.
- Graceful degrade when custom file vanishes mid-test (warn + identity+mode+base).
- Cache stability across N no-change turns with style; content-edit forces MISS;
  `touch`-only does not.
- `assembleForInspect` includes the style fragment.

### Regression: `tests/cache-stability.test.ts` + `tests/noop.test.ts` +
`tests/clean-base.test.ts` (extend — Unit 5)
- Add `resetStyleForTesting()` to `beforeEach`; assert the existing byte-stability
  and one-copy assertions still hold with no style configured (proving the
  style layer is inert when unselected).

### Unit tests: `tests/commands.test.ts` (extend — Unit 6)
- `/mode:inspect` Style line for each source; `style-switched` reason detail.
- `formatModeListing` / `formatModeFooter` byte-unchanged (no style leakage).

## Risks

- **Custom-file path exfiltration (highest-stakes).** A cloned repo could ship
  a `<cwd>/.pi/pi-model-modes.json` whose `customStyles` point at
  `~/.ssh/id_rsa` or `/etc/passwd`, exfiltrating them into the system prompt.
  Mitigation: relative-only + `.md`-only + `realpath` containment to
  `dirname(configPath)`, defended twice (seed + per turn). Residual: a file the
  attacker can already write inside `<cwd>/.pi/` could still be read — but that
  is content the user already pulled down with the repo, so it is not net-new
  exfiltration. Acceptable; the rule blocks the cross-boundary reads that
  matter.

- **TOCTOU between seed and per-turn read.** A file valid at `session_start`
  could be swapped (or replaced by an escaping symlink) before the next turn's
  `loadFragment`. Mitigation: `resolveActiveStylePlan` re-runs
  `resolveCustomStylePath` every turn before reading. Residual cost: one
  `realpathSync` per turn per active custom style — negligible next to the
  existing per-fragment `statSync`.

- **Asymmetric degrade (style vs. mode).** Style resolution is wrapped
  (graceful degrade); mode resolution is not (pre-existing — a vanished mode
  fragment throws). This is deliberate (style is optional and user-file-backed;
  mode is curated package data) and out of scope to retrofit onto mode. Noted
  for a future hardening item.

- **Cache-key encoding change.** Adding a 6th component invalidates every
  in-memory cache key on the first turn after upgrade. Effect: one MISS +
  re-assemble per session. No persistence, no cross-version concern.

- **`realpathSync` cost / failure modes.** Per-turn `realpathSync` on the
  custom path could fail if the config dir itself vanished (extremely unlikely
  mid-session). That throws → degrade → no-style for the turn. Acceptable.

- **Style + modifier overlap (`speak-plain`, `playful`).** Kept as modifiers
  (load-bearing in presets). A selected style composes with them; the modifier
  (later in splice) refines on conflict. If users report confusion, a future
  feature can reconcile; out of scope here.

## Child stories

**None.** The feature is implemented as a single cohesive stride by one owner.

Per the feature-design skill's "when stories are pure overhead" rule, all four
conditions hold here: single-stride implementation (one session finishes the
whole feature); tight cohesion (cache key, splice, and resolver changes all
interlock at the `handler.ts` integration point — no chunk is independently
shippable); every test exercises the same per-turn pipeline (not meaningfully
independent surfaces); and there is no parallelization payoff (every unit
touches `cache.ts`/`handler.ts`/`commands.ts`, so fan-out would serialize on
the same files). Splitting would also create an artificial intermediate state
(Unit 2's resolver existing but uncalled by Unit 5's handler) — a smell.

The Implementation Order section above is the unit decomposition; the
`implement` skill (or `implement-orchestrator` driving the feature as one
stride) works through it linearly. An `epic`-level split is not warranted —
this is one feature, not a multi-feature arc.

## Next

`stage: drafting → implementing` complete. Hand off to the `implementor`:
- `/agile-workflow:implement feature-configurable-writing-styles` for a single
  inline stride through Units 1–7 in order, or
- `/agile-workflow:implement-orchestrator feature-configurable-writing-styles`
  to drive the feature as one cohesive implementation with verification at each
  unit boundary.

## Implementation notes

- Execution capability: inline host implementation; the feature was cohesive around one per-turn pipeline, and direct reads fully established the integration surface without delegation.
- Review weight: `standard` (project default, confirmed by caller).
- Files changed: `prompts/styles/{clear,compact,explanatory,expressive}.md`; `src/{style,config,cache,assemble,handler,commands}.ts`; `tests/{style,handler-style,config,cache,commands,handler-mode,cache-stability,noop,clean-base}.test.ts`; `docs/{SPEC,ARCHITECTURE,VISION}.md`; `README.md`; `CHANGELOG.md`.
- Tests added: style-name/catalog/resolver/path-containment and symlink cases; config scope/merge/seeding cases; cache style-key/reason/priority cases; handler ordering, byte-compatibility, graceful-degrade, inspect parity, and content/touch invalidation cases; inspect style-state and change-detail cases.
- Verification: focused style/config/cache/handler/inspect suite passed (166 tests); final full suite passed (408 tests); `tsc --noEmit` passed.
- Discrepancies from design: none.
- Adjacent issues parked: none.
