import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import {
  discoverBundledStyles,
  isValidStyleName,
  resetStyleForTesting,
  resolveActiveStylePlan,
  resolveCustomStylePath,
  setStyleSelection,
} from "../src/style.js";
import { resetFragmentsForTesting } from "../src/fragments.js";

let tmp: string | undefined;

function freshDir(): string {
  tmp = mkdtempSync(join(tmpdir(), "style-"));
  return tmp;
}

function write(root: string, rel: string, content: string): string {
  const path = join(root, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

beforeEach(() => {
  resetStyleForTesting();
  resetFragmentsForTesting();
});

afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
  resetStyleForTesting();
  resetFragmentsForTesting();
});

describe("resolveCustomStylePath — containment boundary", () => {
  it("accepts a relative Markdown regular file", () => {
    const root = freshDir();
    const target = write(root, "styles/team.md", "TEAM");
    expect(resolveCustomStylePath("styles/team.md", root)).toBe(target);
  });

  it("rejects empty, absolute, non-Markdown, missing, directory, and .. escape paths distinctly", () => {
    const root = freshDir();
    const outside = write(join(root, ".."), `outside-${basename(root)}.md`, "SECRET");
    mkdirSync(join(root, "directory.md"));
    expect(() => resolveCustomStylePath("", root)).toThrow(/empty/);
    expect(() => resolveCustomStylePath(outside, root)).toThrow(/must be relative/);
    expect(() => resolveCustomStylePath("style.txt", root)).toThrow(/must end in/);
    expect(() => resolveCustomStylePath("missing.md", root)).toThrow(/not found/);
    expect(() => resolveCustomStylePath("directory.md", root)).toThrow(/not a regular file/);
    expect(() => resolveCustomStylePath(`../${basename(outside)}`, root)).toThrow(/escapes/);
    rmSync(outside, { force: true });
  });

  it("accepts in-root symlinks and rejects symlinks escaping the root", () => {
    const root = freshDir();
    write(root, "inside.md", "INSIDE");
    const outside = write(join(root, ".."), `outside-link-${basename(root)}.md`, "SECRET");
    symlinkSync("inside.md", join(root, "inside-link.md"));
    symlinkSync(outside, join(root, "outside-link.md"));
    expect(resolveCustomStylePath("inside-link.md", root)).toBe(join(root, "inside.md"));
    expect(() => resolveCustomStylePath("outside-link.md", root)).toThrow(/escapes/);
    rmSync(outside, { force: true });
  });
});

describe("style catalog and resolution", () => {
  it("discovers the four bundled styles in sorted order", () => {
    expect(discoverBundledStyles().map((path) => basename(path))).toEqual([
      "clear.md",
      "compact.md",
      "explanatory.md",
      "expressive.md",
    ]);
  });

  it.each([
    ["clear", true],
    ["my-team-voice", true],
    ["../x", false],
    ["Bad Name", false],
    ["UPPER", false],
    ["", false],
  ])("validates style name %j", (name, valid) => {
    expect(isValidStyleName(name)).toBe(valid);
  });

  it("returns unset, explicit none, and bundled plans", () => {
    expect(resolveActiveStylePlan()).toMatchObject({ source: "unset", content: "", signature: "" });
    setStyleSelection({ selection: "none", registry: new Map() });
    expect(resolveActiveStylePlan()).toMatchObject({ source: "none", content: "", signature: "" });
    setStyleSelection({ selection: "clear", registry: new Map() });
    const bundled = resolveActiveStylePlan();
    expect(bundled.name).toBe("clear");
    expect(bundled.source).toBe("bundled");
    expect(bundled.content.length).toBeGreaterThan(0);
    expect(bundled.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("custom registration wins on a bundled-name collision and vanished files throw", () => {
    const root = freshDir();
    const path = write(root, "clear.md", "CUSTOM CLEAR");
    setStyleSelection({
      selection: "clear",
      registry: new Map([
        ["clear", { rawRel: "clear.md", configDir: root, scope: "project" }],
      ]),
    });
    expect(resolveActiveStylePlan()).toMatchObject({
      name: "clear",
      source: "custom-project",
      content: "CUSTOM CLEAR",
    });
    rmSync(path);
    expect(() => resolveActiveStylePlan()).toThrow(/not found/);
  });
});
