import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Fragment loader — convention-directory discovery + stat/mtime-invalidated
 * module-scope content cache. Pure file layer: paths in, trimmed content out.
 * No naming, selection, or splice policy (that's resolver/assemble). Module-scope
 * mutable state is EXPECTED (the content cache IS stateful); reset for tests.
 *
 * Root is package-relative (<package>/prompts/), never cwd-relative — this runs
 * as a pi package loaded via jiti in the user's working dir. A test-only root
 * override loads fixtures deterministically.
 *
 * Design: `.work/active/features/epic-mode-composition-fragment-loader.md`.
 */

/** The three convention axes. Exactly one value per axis is selected downstream. */
export type Axis = "agency" | "quality" | "scope";
export const AXES: readonly Axis[] = ["agency", "quality", "scope"] as const;

/** Shape of <root>/base.json. `overlays` are paths relative to <root>; array
 *  order is the load-bearing base splice order. */
export interface BaseManifest {
  overlays: string[];
}

/** One cached file: numeric mtimeMs + trimmed content. */
interface CacheEntry {
  mtimeMs: number;
  content: string;
}

// --- Module-scope state (mutable by design) --------------------------------
const PACKAGE_ROOT = fileURLToPath(new URL("../prompts/", import.meta.url));
let rootOverride: string | undefined;
const contentCache = new Map<string, CacheEntry>();

function fragmentRoot(): string {
  return rootOverride ?? PACKAGE_ROOT;
}

// --- Internal helpers -------------------------------------------------------

/** `.md` files in `dir`, mapped to absolute paths, filename-sorted ascending. */
function listMarkdown(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => join(dir, e.name))
    .sort();
}

// --- Discovery --------------------------------------------------------------

/**
 * Absolute paths of the `.md` files in one axis dir, filename-sorted ascending.
 * FAIL FAST: throws if the dir is missing OR empty (an axis must have ≥1 value).
 */
export function discoverAxis(axis: Axis): string[] {
  const dir = join(fragmentRoot(), "axis", axis);
  let files: string[];
  try {
    files = listMarkdown(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Fragment axis dir not found: ${dir}`);
    }
    throw err;
  }
  if (files.length === 0) {
    throw new Error(`Fragment axis '${axis}' is empty: ${dir}`);
  }
  return files;
}

/**
 * Absolute paths of the `.md` files in `modifiers/`, filename-sorted ascending.
 * FAIL FAST: throws if the dir is MISSING. An EMPTY modifiers dir returns `[]`
 * (zero modifiers is a valid library state).
 */
export function discoverModifiers(): string[] {
  const dir = join(fragmentRoot(), "modifiers");
  try {
    return listMarkdown(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Fragment modifiers dir not found: ${dir}`);
    }
    throw err;
  }
}

/**
 * Parse <root>/base.json and resolve each `overlays` entry to an absolute path,
 * preserving manifest order (load-bearing). FAIL FAST: throws if base.json is
 * missing/unparseable, if `overlays` is not a string[], or if any referenced
 * overlay file does not exist (orphaned manifest entry).
 */
export function discoverBaseOverlays(): string[] {
  const root = fragmentRoot();
  const manifestPath = join(root, "base.json");

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`base.json not found: ${manifestPath}`);
    }
    throw new Error(`Malformed base.json (unparseable): ${manifestPath}`);
  }

  const overlays = (parsed as { overlays?: unknown } | null)?.overlays;
  if (
    !Array.isArray(overlays) ||
    !overlays.every((e) => typeof e === "string")
  ) {
    throw new Error(
      `Malformed base.json: 'overlays' must be a string[]: ${manifestPath}`,
    );
  }

  return (overlays as string[]).map((entry) => {
    const abs = join(root, entry);
    try {
      statSync(abs);
    } catch {
      throw new Error(
        `base.json references missing overlay: ${abs} (entry "${entry}")`,
      );
    }
    return abs;
  });
}

// --- Content load -----------------------------------------------------------

/**
 * Trimmed content for an absolute fragment path, through the stat/mtime cache.
 * Stats the file every call; re-reads only when mtimeMs changed since the cached
 * entry. FAIL FAST: throws if the path cannot be stat'd/read (missing/unreadable).
 */
export function loadFragment(path: string): string {
  const st = statSync(path);
  const hit = contentCache.get(path);
  if (hit && hit.mtimeMs === st.mtimeMs) {
    return hit.content;
  }
  const content = readFileSync(path, "utf8").trim();
  contentCache.set(path, { mtimeMs: st.mtimeMs, content });
  return content;
}

// --- Test-only API (mirrors cache.ts resetForTesting idiom) -----------------

/** TEST-ONLY: override the fragment root (absolute). `undefined` restores the
 *  package-relative default. */
export function setFragmentRootForTesting(absRoot: string | undefined): void {
  rootOverride = absRoot;
}

/** TEST-ONLY: clear the content cache AND reset the root override. */
export function resetFragmentCacheForTesting(): void {
  contentCache.clear();
  rootOverride = undefined;
}
