import { readFileSync, writeFileSync, renameSync, mkdirSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { setDefaultMode, clearDefaultMode, clearActiveMode } from "./resolver.js";

/**
 * Plugin-owned configuration — the durable, file-backed source for the
 * DEFAULT mode tier (precedence override > default > unset).
 *
 * Config is plugin-owned, NOT pi's closed `Settings` (which has no plugin
 * namespace). Two files are read and shallow-merged, project over global:
 *   - global:  `~/.pi/agent/pi-model-modes.json`
 *   - project: `<cwd>/.pi/pi-model-modes.json`
 *
 * Tolerant by design — a missing file is `{}`; a malformed file warns and is
 * treated as `{}`. Loading config never throws, so `session_start` seeding
 * can never crash the session. Shape is `{ defaultMode?, cycleKeybinding? }`,
 * extensible.
 *
 * Pure module (Node builtins + the resolver's default-tier setter only). The
 * two absolute paths are overridable via a test seam so tests never touch the
 * real home dir.
 *
 * Design: `.work/active/features/epic-switching-paths-config-default.md`.
 */

/** The v1 plugin config shape (extensible). */
export interface PluginConfig {
  defaultMode?: string;
  cycleKeybinding?: boolean;
}

// --- config file paths (override via the test seam) --------------------------

let globalPathOverride: string | undefined;
let projectPathOverride: string | undefined;

/** The global config path: `~/.pi/agent/pi-model-modes.json`. */
export function globalConfigPath(): string {
  return (
    globalPathOverride ??
    join(homedir(), ".pi", "agent", "pi-model-modes.json")
  );
}

/** The project config path: `<cwd>/.pi/pi-model-modes.json`. */
export function projectConfigPath(cwd: string): string {
  return projectPathOverride ?? join(cwd, ".pi", "pi-model-modes.json");
}

/**
 * Read one config file tolerantly: missing → `{}`; valid JSON object → parsed;
 * anything else (parse error, non-object) → `console.warn` + `{}`. Never throws.
 */
function readConfigFile(path: string): PluginConfig {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (cause) {
    // ENOENT (and any other read failure) → treat as absent, silently.
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    console.warn(`pi-model-modes: could not read config "${path}": ${(cause as Error).message}`);
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      console.warn(`pi-model-modes: config "${path}" is not a JSON object — ignoring`);
      return {};
    }
    return parsed as PluginConfig;
  } catch (cause) {
    console.warn(`pi-model-modes: config "${path}" is not valid JSON (${(cause as Error).message}) — ignoring`);
    return {};
  }
}

function readCycleKeybindingFlag(config: PluginConfig, path: string): boolean {
  const value = (config as { cycleKeybinding?: unknown }).cycleKeybinding;
  if (value === undefined) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  console.warn(
    `pi-model-modes: config "${path}" cycleKeybinding must be a boolean — disabling cycle keybindings`,
  );
  return false;
}

/**
 * Load the merged plugin config: global `~/.pi/agent/pi-model-modes.json`
 * shallow-merged with project `<cwd>/.pi/pi-model-modes.json`, PROJECT WINS.
 * Each file is read tolerantly (missing → `{}`, malformed → warn + `{}`), so
 * this never throws.
 */
export function loadPluginConfig(cwd: string): PluginConfig {
  const global = readConfigFile(globalConfigPath());
  const project = readConfigFile(projectConfigPath(cwd));
  return { ...global, ...project };
}

/**
 * Load the GLOBAL plugin config only. Factory-load-time decisions such as
 * keybinding registration cannot depend on project config because cwd is not
 * known yet and pi keybindings are process-global.
 */
export function loadGlobalPluginConfig(): PluginConfig {
  const path = globalConfigPath();
  const global = readConfigFile(path);
  return {
    ...global,
    cycleKeybinding: readCycleKeybindingFlag(global, path),
  };
}

/**
 * Reconcile the DEFAULT mode tier to the CURRENT merged config. Idempotent and
 * safe to call on every `session_start` (which fires on startup/reload/new/
 * resume/fork): the default tier always ends up reflecting the config as it is
 * NOW, never a stale value from a prior reseed.
 *   - valid `defaultMode`   → `setDefaultMode(it)`
 *   - no `defaultMode`      → `clearDefaultMode()` (no default configured)
 *   - invalid `defaultMode` → warn + `clearDefaultMode()` (the configured default
 *     is unusable; fall back to no-default rather than keeping a stale one)
 * An INVALID default (unknown preset / missing fragment) is caught and warned —
 * NEVER rethrown — so `session_start` can never crash from a bad config value.
 */
export function applyDefaultFromConfig(cwd: string): void {
  const config = loadPluginConfig(cwd);
  if (config.defaultMode === undefined) {
    clearDefaultMode();
    return;
  }
  try {
    setDefaultMode(config.defaultMode);
  } catch (cause) {
    console.warn(
      `pi-model-modes: invalid config defaultMode "${config.defaultMode}" — skipping (${(cause as Error).message})`,
    );
    clearDefaultMode();
  }
}

/** Why a `session_start` fired (mirrors pi's `SessionStartEvent.reason`). */
export type SessionStartReason =
  | "startup"
  | "reload"
  | "new"
  | "resume"
  | "fork";

/**
 * Handle a `session_start`. The session OVERRIDE (`/mode`, keybinding) is
 * EPHEMERAL per the SPEC: a genuinely new session must restart from the config
 * default, so the in-process override (module state that outlives a session
 * boundary) is cleared on `new` / `resume` / `fork`. A same-session `reload`
 * (and the initial `startup`, which has no prior override) preserves any active
 * override. The DEFAULT tier is always reconciled to the current config.
 *
 * Without the clear, an override set in one session would survive into the next
 * same-process session and keep winning `override ?? default` — contradicting
 * "a new session restarts from the config default."
 */
export function applySessionStart(reason: SessionStartReason, cwd: string): void {
  if (reason === "new" || reason === "resume" || reason === "fork") {
    clearActiveMode();
  }
  applyDefaultFromConfig(cwd);
}

// ===========================================================================
// Default-mode writer + scope reader (the `/mode default` surface).
// ===========================================================================
//
// Below is the write-side counterpart to the tolerant read-side loader above.
// Design locked post Codex (advisory) + Opus (adversarial) cross-review; see
// `.work/active/features/feature-mode-default-management.md`.

/** Which config file a `/mode default` write targets. */
export type DefaultScope = "project" | "global";

/**
 * The value to write for `defaultMode`. `"off"` clears the key; `"none"` is
 * the virtual no-mode default (a real persisted value the resolver accepts);
 * any other string is a preset name validated upstream by the command layer.
 */
export type DefaultValue = string;

/** Sentinel action meaning "clear the default". */
export const DEFAULT_OFF = "off";

/** Success: the writer reports the new effective default + which scope won. */
export interface WriteDefaultOk {
  ok: true;
  /** The scope that was just written. */
  writtenScope: DefaultScope;
  /** The value just written (`undefined` when `off` cleared the only default). */
  writtenValue: string | undefined;
  /**
   * The EFFECTIVE default after re-merge (project wins over global). `undefined`
   * when no default remains in either scope. Used by the command layer to build
   * a truthful notify without re-reading.
   */
  effective: { value: string | undefined; source: "global" | "project" | "unset" };
}

/** Failure: file unreadable, write failed, etc. The resolver is untouched. */
export interface WriteDefaultErr {
  ok: false;
  /** The target path; included so the error toast can name it. */
  path: string;
  /** Human-readable failure reason. */
  error: string;
}

export type WriteDefaultResult = WriteDefaultOk | WriteDefaultErr;

/**
 * STRICT read-for-write: parse the file at `path` as a JSON object. Unlike the
 * tolerant `readConfigFile`, this NEVER silently returns `{}` for malformed
 * input — that would let a `/mode default` write blow away a hand-edited
 * broken file (Codex high finding). Missing file → `{}`. Anything else →
 * throws with a clear message naming the path + parse error.
 */
function readObjectForWrite(path: string): Record<string, unknown> {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw cause;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new Error(
      `"${path}" is not valid JSON (${(cause as Error).message}) — refusing to overwrite`,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`"${path}" is not a JSON object — refusing to overwrite`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Write the durable default mode to the chosen scope's config file, then
 * reconcile the resolver's default tier via the LIVE merge path
 * (`applyDefaultFromConfig` — reloads + shallow-merges BOTH files). The merge
 * matters: clearing a project default while a global default exists must
 * fall back to the global value, not to `unset` (Opus blocker).
 *
 * Pipeline (validate → write → reconcile, NO early mutation):
 *   1. Resolve `path` via the existing `globalConfigPath`/`projectConfigPath`
 *      seams so `setConfigPathsForTesting` intercepts writes (Opus medium).
 *   2. Strict-read the target file (malformed → fail, do NOT overwrite).
 *   3. Mutate in memory: set or `delete` `defaultMode`; siblings preserved.
 *   4. Serialize as `JSON.stringify(obj, null, 2) + "\n"` (Opus medium).
 *   5. Atomic write: `writeFileSync(path.tmp)` + `renameSync(tmp, path)`
 *      (both reviewers). The reader is tolerant, so a torn concurrent read
 *      silently degrades to `{}` and drops the default for that session_start
 *      — atomic rename is cheap insurance.
 *   6. Bootstrap parent dir for BOTH scopes via `mkdirSync(recursive)`
 *      (Codex medium; global may be absent on a fresh machine).
 *   7. Reconcile via `applyDefaultFromConfig(cwd)` (Opus blocker — NOT
 *      `applySessionStart`, which clears the override).
 *   8. Return the effective default + source so the caller builds a truthful
 *      notify without re-reading.
 *
 * NEVER touches the EPHEMERAL override tier — the precedence invariant
 * (override > default > unset) is preserved exactly.
 */
export function writeDefaultToConfig(
  cwd: string,
  value: DefaultValue,
  scope: DefaultScope,
): WriteDefaultResult {
  const path = scope === "global" ? globalConfigPath() : projectConfigPath(cwd);

  let loaded: Record<string, unknown>;
  try {
    loaded = readObjectForWrite(path);
  } catch (cause) {
    return { ok: false, path, error: (cause as Error).message };
  }

  // Mutate in memory — siblings (cycleKeybinding, future keys) preserved.
  const next: Record<string, unknown> = { ...loaded };
  const cleared = value === DEFAULT_OFF;
  if (cleared) {
    delete next.defaultMode;
  } else {
    next.defaultMode = value;
  }

  const text = `${JSON.stringify(next, null, 2)}\n`;
  const tmpPath = `${path}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(tmpPath, text);
    renameSync(tmpPath, path);
  } catch (cause) {
    // Best-effort cleanup of the tmp file on a failed write/rename. If the
    // tmp doesn't exist (writeFileSync threw before creating it) the unlink
    // is a no-op; either way we surface the original fs error, not the cleanup.
    try {
      unlinkSync(tmpPath);
    } catch {
      // intentional — best-effort
    }
    return { ok: false, path, error: (cause as Error).message };
  }

  // Reconcile via the live merge — picks up global/project precedence.
  applyDefaultFromConfig(cwd);

  return {
    ok: true,
    writtenScope: scope,
    writtenValue: cleared ? undefined : value,
    effective: effectiveDefaultSource(cwd),
  };
}

/**
 * Compute the effective default + which scope it came from, post-merge. Used
 * both by the writer (for the result) and by the bare `/mode default` panel.
 */
export function effectiveDefaultSource(cwd: string): {
  value: string | undefined;
  source: "global" | "project" | "unset";
} {
  // Shallow-merge project-over-global — same path `applyDefaultFromConfig` uses.
  const merged = loadPluginConfig(cwd);
  if (merged.defaultMode !== undefined) {
    // Project wins when both set; otherwise whatever's set.
    const project = readConfigFile(projectConfigPath(cwd)).defaultMode;
    const source = project !== undefined ? "project" : "global";
    return { value: merged.defaultMode, source };
  }
  return { value: undefined, source: "unset" };
}

/**
 * Read both raw scopes for the bare `/mode default` panel. Each entry is the
 * `defaultMode` value from that file (or `undefined` if absent). A malformed
 * file is surfaced as the string `"(unreadable)"` rather than crashing the
 * panel — matches the reader's tolerant contract.
 */
export function readDefaultSources(cwd: string): {
  global: string | undefined | "(unreadable)";
  project: string | undefined | "(unreadable)";
} {
  const safe = (path: string): string | undefined | "(unreadable)" => {
    try {
      return readObjectForWrite(path).defaultMode as string | undefined;
    } catch {
      return "(unreadable)";
    }
  };
  return {
    global: safe(globalConfigPath()),
    project: safe(projectConfigPath(cwd)),
  };
}

/**
 * TEST-ONLY: override the two config file paths so tests never read the real
 * home dir. Omitted keys leave the corresponding path at its default.
 */
export function setConfigPathsForTesting(paths: {
  global?: string;
  project?: string;
}): void {
  globalPathOverride = paths.global;
  projectPathOverride = paths.project;
}

/** TEST-ONLY: clear the config path overrides. */
export function resetConfigForTesting(): void {
  globalPathOverride = undefined;
  projectPathOverride = undefined;
}
