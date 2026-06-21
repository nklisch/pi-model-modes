import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadPluginConfig,
  applyDefaultFromConfig,
  applySessionStart,
  setConfigPathsForTesting,
  resetConfigForTesting,
} from "../src/config.js";
import {
  getDefaultMode,
  getEffectiveModeSource,
  resolveActiveModePlan,
  resetResolverForTesting,
  setActiveMode,
  getActiveMode,
} from "../src/resolver.js";
import {
  setFragmentRootForTesting,
  resetFragmentCacheForTesting,
} from "../src/fragments.js";
import { resetPresetsForTesting } from "../src/presets.js";

/**
 * Tests for `src/config.ts` — the plugin-owned config loader + default-tier
 * seeding. The two config file paths are overridden via the test seam
 * (`setConfigPathsForTesting`) so tests never touch the real home dir; temp
 * files supply the actual JSON. A fragment fixture is built so a valid
 * `defaultMode` resolves through `setDefaultMode`.
 */

let dir: string | undefined;
let fragRoot: string | undefined;

function freshDir(): string {
  const d = mkdtempSync(join(tmpdir(), "config-"));
  dir = d;
  return d;
}

function writeJson(path: string, obj: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(obj), "utf8");
}

function writeRaw(path: string, text: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text, "utf8");
}

/** Build a fragment fixture covering the shipped "default"/"flow" presets. */
function buildFragments(): void {
  const root = mkdtempSync(join(tmpdir(), "config-frag-"));
  fragRoot = root;
  const w = (rel: string, content: string): void => {
    const abs = join(root, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content, "utf8");
  };
  w("axis/agency/autonomous.md", "AGENCY-autonomous");
  w("axis/quality/pragmatic.md", "QUALITY-pragmatic");
  w("axis/scope/adjacent.md", "SCOPE-adjacent");
  w("modifiers/tdd.md", "MOD-tdd");
  setFragmentRootForTesting(root);
}

beforeEach(() => {
  resetResolverForTesting();
  resetConfigForTesting();
  resetFragmentCacheForTesting();
  resetPresetsForTesting();
});

afterEach(() => {
  for (const d of [dir, fragRoot]) {
    if (d) rmSync(d, { recursive: true, force: true });
  }
  dir = undefined;
  fragRoot = undefined;
  resetResolverForTesting();
  resetConfigForTesting();
  resetFragmentCacheForTesting();
  resetPresetsForTesting();
  vi.restoreAllMocks();
});

describe("loadPluginConfig — merge + tolerance", () => {
  it("global only", () => {
    const d = freshDir();
    const global = join(d, "global.json");
    writeJson(global, { defaultMode: "flow" });
    setConfigPathsForTesting({ global, project: join(d, "missing-project.json") });
    expect(loadPluginConfig("/unused")).toEqual({ defaultMode: "flow" });
  });

  it("project only", () => {
    const d = freshDir();
    const project = join(d, "project.json");
    writeJson(project, { defaultMode: "default" });
    setConfigPathsForTesting({
      global: join(d, "missing-global.json"),
      project,
    });
    expect(loadPluginConfig("/unused")).toEqual({ defaultMode: "default" });
  });

  it("project overrides global (shallow merge, project wins)", () => {
    const d = freshDir();
    const global = join(d, "global.json");
    const project = join(d, "project.json");
    writeJson(global, { defaultMode: "default" });
    writeJson(project, { defaultMode: "flow" });
    setConfigPathsForTesting({ global, project });
    expect(loadPluginConfig("/unused")).toEqual({ defaultMode: "flow" });
  });

  it("both files missing → {}", () => {
    const d = freshDir();
    setConfigPathsForTesting({
      global: join(d, "nope-global.json"),
      project: join(d, "nope-project.json"),
    });
    expect(loadPluginConfig("/unused")).toEqual({});
  });

  it("malformed JSON → warn + {} (no throw)", () => {
    const d = freshDir();
    const global = join(d, "bad.json");
    writeRaw(global, "{ not valid json ");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setConfigPathsForTesting({
      global,
      project: join(d, "missing-project.json"),
    });
    expect(loadPluginConfig("/unused")).toEqual({});
    expect(warn).toHaveBeenCalled();
  });

  it("non-object JSON (array) → warn + {}", () => {
    const d = freshDir();
    const global = join(d, "arr.json");
    writeRaw(global, "[1, 2, 3]");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setConfigPathsForTesting({
      global,
      project: join(d, "missing-project.json"),
    });
    expect(loadPluginConfig("/unused")).toEqual({});
    expect(warn).toHaveBeenCalled();
  });
});

describe("applyDefaultFromConfig — seeding", () => {
  it("seeds a valid default into the resolver's default tier", () => {
    buildFragments();
    const d = freshDir();
    const global = join(d, "global.json");
    writeJson(global, { defaultMode: "default" });
    setConfigPathsForTesting({
      global,
      project: join(d, "missing-project.json"),
    });

    applyDefaultFromConfig("/unused");

    expect(getDefaultMode()).toBe("default");
    expect(getEffectiveModeSource()).toBe("default");
    expect(resolveActiveModePlan().mode?.agency).toBe("autonomous");
  });

  it("no defaultMode in config → leaves the default tier unset (no-op)", () => {
    const d = freshDir();
    const global = join(d, "global.json");
    writeJson(global, {});
    setConfigPathsForTesting({
      global,
      project: join(d, "missing-project.json"),
    });

    applyDefaultFromConfig("/unused");
    expect(getDefaultMode()).toBeUndefined();
    expect(getEffectiveModeSource()).toBe("unset");
  });

  it("invalid default → warn + skip (no throw, default tier stays unset)", () => {
    buildFragments();
    const d = freshDir();
    const global = join(d, "global.json");
    writeJson(global, { defaultMode: "no-such-preset" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setConfigPathsForTesting({
      global,
      project: join(d, "missing-project.json"),
    });

    expect(() => applyDefaultFromConfig("/unused")).not.toThrow();
    expect(getDefaultMode()).toBeUndefined();
    expect(getEffectiveModeSource()).toBe("unset");
    expect(warn).toHaveBeenCalled();
  });

  it("reconciles on reseed: a config with no defaultMode CLEARS a prior default (not stale)", () => {
    // session_start fires repeatedly (reload/new/resume). A second seed whose
    // config no longer names a defaultMode must clear the prior one, not leave
    // it stale and effective.
    buildFragments();
    const d = freshDir();
    const withDefault = join(d, "with.json");
    const without = join(d, "without.json");
    writeJson(withDefault, { defaultMode: "default" });
    writeJson(without, {});

    setConfigPathsForTesting({ global: withDefault, project: join(d, "missing.json") });
    applyDefaultFromConfig("/unused");
    expect(getDefaultMode()).toBe("default"); // seeded

    // Reseed with a config that has no defaultMode → prior default cleared.
    setConfigPathsForTesting({ global: without, project: join(d, "missing.json") });
    applyDefaultFromConfig("/unused");
    expect(getDefaultMode()).toBeUndefined();
    expect(getEffectiveModeSource()).toBe("unset");
  });

  it("reconciles on reseed: an INVALID new defaultMode CLEARS a prior valid default", () => {
    buildFragments();
    const d = freshDir();
    const good = join(d, "good.json");
    const bad = join(d, "bad.json");
    writeJson(good, { defaultMode: "default" });
    writeJson(bad, { defaultMode: "no-such-preset" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    setConfigPathsForTesting({ global: good, project: join(d, "missing.json") });
    applyDefaultFromConfig("/unused");
    expect(getDefaultMode()).toBe("default");

    setConfigPathsForTesting({ global: bad, project: join(d, "missing.json") });
    applyDefaultFromConfig("/unused");
    expect(getDefaultMode()).toBeUndefined(); // stale prior default cleared, not retained
    expect(warn).toHaveBeenCalled();
  });
});

describe("applySessionStart — ephemeral override clearing", () => {
  const override = {
    base: "pi",
    agency: "autonomous",
    quality: "pragmatic",
    scope: "adjacent",
    modifiers: [],
  };

  function configWithNoDefault(): void {
    const d = freshDir();
    setConfigPathsForTesting({
      global: join(d, "missing-global.json"),
      project: join(d, "missing-project.json"),
    });
  }

  it.each(["new", "resume", "fork"] as const)(
    "clears the ephemeral override on a genuinely new session (reason: %s)",
    (reason) => {
      buildFragments();
      configWithNoDefault();
      setActiveMode(override); // a session override is active
      expect(getEffectiveModeSource()).toBe("override");

      applySessionStart(reason, "/unused");

      // The new session restarts from the config default (here: unset).
      expect(getActiveMode()).toBeUndefined();
      expect(getEffectiveModeSource()).toBe("unset");
    },
  );

  it.each(["reload", "startup"] as const)(
    "preserves the override on a same-session start (reason: %s)",
    (reason) => {
      buildFragments();
      configWithNoDefault();
      setActiveMode(override);

      applySessionStart(reason, "/unused");

      // A reload / initial startup keeps the active override.
      expect(getActiveMode()).toEqual(override);
      expect(getEffectiveModeSource()).toBe("override");
    },
  );

  it("still reconciles the default tier on every reason", () => {
    buildFragments();
    const d = freshDir();
    const global = join(d, "global.json");
    writeJson(global, { defaultMode: "default" });
    setConfigPathsForTesting({ global, project: join(d, "missing.json") });

    applySessionStart("reload", "/unused");
    expect(getDefaultMode()).toBe("default"); // default seeded from config
  });
});
