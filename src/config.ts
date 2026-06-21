import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setDefaultMode } from "./resolver.js";

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
 * can never crash the session. v1 shape is `{ defaultMode? }`, extensible.
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
}

// --- config file paths (override via the test seam) --------------------------

let globalPathOverride: string | undefined;
let projectPathOverride: string | undefined;

/** The global config path: `~/.pi/agent/pi-model-modes.json`. */
function globalConfigPath(): string {
  return (
    globalPathOverride ??
    join(homedir(), ".pi", "agent", "pi-model-modes.json")
  );
}

/** The project config path: `<cwd>/.pi/pi-model-modes.json`. */
function projectConfigPath(cwd: string): string {
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
 * Seed the DEFAULT mode tier from config. Loads the merged config and, when a
 * `defaultMode` is present, calls `setDefaultMode(defaultMode)`. An INVALID
 * default (unknown preset / missing fragment) is caught and warned — NEVER
 * rethrown — so `session_start` can never crash from a bad config value.
 */
export function applyDefaultFromConfig(cwd: string): void {
  const config = loadPluginConfig(cwd);
  if (config.defaultMode === undefined) {
    return;
  }
  try {
    setDefaultMode(config.defaultMode);
  } catch (cause) {
    console.warn(
      `pi-model-modes: invalid config defaultMode "${config.defaultMode}" — skipping (${(cause as Error).message})`,
    );
  }
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
