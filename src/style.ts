import { createHash } from "node:crypto";
import { readdirSync, realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFragment } from "./fragments.js";

/** No-style sentinel for the cache-key contribution. */
export const NO_STYLE_SIGNATURE = "";

export interface CustomStyleEntry {
  rawRel: string;
  configDir: string;
  scope: "global" | "project";
}

export interface StyleSelection {
  selection: string | undefined;
  registry: ReadonlyMap<string, CustomStyleEntry>;
}

export type StyleSource =
  | "bundled"
  | "custom-global"
  | "custom-project"
  | "none"
  | "unset";

export interface StylePlan {
  name: string | undefined;
  source: StyleSource;
  content: string;
  signature: string;
}

const STYLE_NAME_RE = /^[a-z][a-z0-9-]*$/;
const BUNDLED_STYLE_ROOT = fileURLToPath(new URL("../prompts/styles/", import.meta.url));
let styleSelection: StyleSelection | undefined;

export function isValidStyleName(name: string): boolean {
  return STYLE_NAME_RE.test(name);
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Resolve a user-authored style without allowing it to cross the directory
 * boundary of the config file that registered it. Realpath containment also
 * rejects escaping symlinks and is intentionally rechecked every turn.
 */
export function resolveCustomStylePath(rawRel: string, configDir: string): string {
  if (typeof rawRel !== "string" || rawRel.length === 0) {
    throw new Error("custom style path is empty");
  }
  if (isAbsolute(rawRel)) {
    throw new Error(`custom style path must be relative (got absolute): "${rawRel}"`);
  }
  if (!rawRel.endsWith(".md")) {
    throw new Error(`custom style path must end in ".md": "${rawRel}"`);
  }

  const rootReal = realpathSync(configDir);
  const candidate = resolve(rootReal, rawRel);
  let targetReal: string;
  try {
    targetReal = realpathSync(candidate);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`custom style file not found: "${rawRel}" (resolved ${candidate})`);
    }
    throw cause;
  }
  if (targetReal !== rootReal && !targetReal.startsWith(rootReal + sep)) {
    throw new Error(
      `custom style path escapes its config directory: "${rawRel}" (resolved ${targetReal})`,
    );
  }
  if (!statSync(targetReal).isFile()) {
    throw new Error(`custom style path is not a regular file: "${rawRel}"`);
  }
  return targetReal;
}

/** Bundled style fragments, filename-sorted. Missing package data fails fast. */
export function discoverBundledStyles(): string[] {
  return readdirSync(BUNDLED_STYLE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(BUNDLED_STYLE_ROOT, entry.name))
    .sort();
}

export function setStyleSelection(selection: StyleSelection | undefined): void {
  styleSelection = selection;
}

export function noStylePlan(source: "none" | "unset"): StylePlan {
  return {
    name: undefined,
    source,
    content: "",
    signature: NO_STYLE_SIGNATURE,
  };
}

export function resolveActiveStylePlan(): StylePlan {
  const state = styleSelection;
  if (state === undefined || state.selection === undefined) return noStylePlan("unset");
  if (state.selection === "none") return noStylePlan("none");

  const custom = state.registry.get(state.selection);
  if (custom) {
    const path = resolveCustomStylePath(custom.rawRel, custom.configDir);
    const content = loadFragment(path);
    return {
      name: state.selection,
      source: custom.scope === "global" ? "custom-global" : "custom-project",
      content,
      signature: sha256(content),
    };
  }

  const bundled = discoverBundledStyles().find(
    (path) => basename(path, ".md") === state.selection,
  );
  if (bundled) {
    const content = loadFragment(bundled);
    return {
      name: state.selection,
      source: "bundled",
      content,
      signature: sha256(content),
    };
  }
  throw new Error(`style "${state.selection}" has no bundled or custom fragment`);
}

/** TEST-ONLY: return style state to its load-time default. */
export function resetStyleForTesting(): void {
  styleSelection = undefined;
}
