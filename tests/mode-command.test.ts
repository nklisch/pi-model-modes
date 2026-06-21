import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import factory from "../extensions/index.js";
import {
  MODE_COMMAND,
  MODE_LISTING_MESSAGE_TYPE,
  registerModeCommand,
} from "../src/commands.js";
import {
  getActiveMode,
  getEffectiveModeSource,
  setDefaultMode,
  resetResolverForTesting,
} from "../src/resolver.js";
import {
  setFragmentRootForTesting,
  resetFragmentCacheForTesting,
} from "../src/fragments.js";
import { resetPresetsForTesting } from "../src/presets.js";
import { resetCacheForTesting } from "../src/cache.js";
import { makePi, makeContext, makeModel } from "./harness.js";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";

/**
 * Tests for the `/mode` command family (`registerModeCommand`). The handler is
 * extracted from the recording pi stub and driven with a fixture prompts tree
 * (covering the real `safe` preset's fragments) + the real bundled presets.json,
 * plus a stub ctx that captures `ctx.ui.notify` calls. Covers: no-arg listing,
 * `<preset>` sets the override, `off` reverts to default, unknown preset errors.
 */

let tmp: string | undefined;

function freshRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "mode-command-"));
  tmp = root;
  setFragmentRootForTesting(root);
  return root;
}

function write(root: string, rel: string, content: string): void {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

/** Build a fixture covering the `safe` + `extend` presets' fragments so those
 *  real presets resolve through the loader. */
function buildFixture(): string {
  const root = freshRoot();
  write(root, "axis/agency/autonomous.md", "AGENCY-autonomous");
  write(root, "axis/agency/collaborative.md", "AGENCY-collaborative");
  write(root, "axis/quality/pragmatic.md", "QUALITY-pragmatic");
  write(root, "axis/quality/minimal.md", "QUALITY-minimal");
  write(root, "axis/scope/adjacent.md", "SCOPE-adjacent");
  write(root, "axis/scope/narrow.md", "SCOPE-narrow");
  write(root, "base.json", JSON.stringify({ overlays: [] }));
  return root;
}

/** Extract the `/mode` command handler from a fresh recording pi. */
function getModeHandler(): {
  pi: ExtensionAPI;
  calls: ReturnType<typeof makePi>["calls"];
  handler: (
    args: string,
    ctx: ExtensionCommandContext,
  ) => Promise<void>;
} {
  const { pi, calls } = makePi();
  registerModeCommand(pi);
  const reg = calls.find(
    (c) => c.method === "registerCommand" && c.args[0] === MODE_COMMAND,
  );
  if (!reg) {
    throw new Error("registerModeCommand did not register a 'mode' command");
  }
  const options = reg.args[1] as {
    handler: (a: string, c: ExtensionCommandContext) => Promise<void>;
  };
  return { pi, calls, handler: options.handler };
}

type NotifyCall = { message: string; type?: string };

/** A ctx stub that records `ctx.ui.notify` calls + carries a model. */
function makeNotifyCtx(): {
  ctx: ExtensionCommandContext;
  notifies: NotifyCall[];
} {
  const notifies: NotifyCall[] = [];
  const ctx = makeContext({
    model: makeModel({ name: "claude-sonnet-4-5", provider: "anthropic" }),
    ui: {
      notify: (message: string, type?: string) => {
        notifies.push({ message, type });
      },
    },
  } as unknown as Partial<ExtensionCommandContext>) as ExtensionCommandContext;
  return { ctx, notifies };
}

beforeEach(() => {
  resetResolverForTesting();
  resetFragmentCacheForTesting();
  resetPresetsForTesting();
  resetCacheForTesting();
});

afterEach(() => {
  if (tmp) {
    rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  }
  resetResolverForTesting();
  resetFragmentCacheForTesting();
  resetPresetsForTesting();
  resetCacheForTesting();
});

describe("/mode command registration", () => {
  it("the factory registers a 'mode' command with a handler", () => {
    const { pi, calls } = makePi();
    factory(pi);
    const reg = calls.find(
      (c) => c.method === "registerCommand" && c.args[0] === MODE_COMMAND,
    );
    expect(reg).toBeDefined();
    expect(typeof (reg!.args[1] as { handler: unknown }).handler).toBe(
      "function",
    );
  });
});

describe("/mode (no arg) — listing", () => {
  it("emits a display-only listing with the effective state + a real preset", async () => {
    buildFixture();
    const { calls, handler } = getModeHandler();
    const { ctx } = makeNotifyCtx();

    await handler("", ctx);

    const sent = calls.find((c) => c.method === "sendMessage");
    expect(sent).toBeDefined();
    const msg = sent!.args[0] as {
      customType: string;
      content: string;
      display: boolean;
    };
    expect(msg.customType).toBe(MODE_LISTING_MESSAGE_TYPE);
    expect(msg.display).toBe(true);
    // Unset effective state + a real bundled preset name appears in the listing.
    expect(msg.content).toContain("Effective mode: unset");
    expect(msg.content).toContain("Available presets:");
    expect(msg.content).toContain("safe");
  });


  it("shows the default tier + spec name when a default is set", async () => {
    buildFixture();
    setDefaultMode("safe");
    const { calls, handler } = getModeHandler();
    const { ctx } = makeNotifyCtx();

    await handler("", ctx);

    const sent = calls.find((c) => c.method === "sendMessage");
    const msg = sent!.args[0] as { content: string };
    expect(msg.content).toContain("safe (default)");
    expect(msg.content).toContain("agency:collaborative");
  });
});

describe("/mode <preset> — set override", () => {
  it("sets the override; getActiveMode reflects it; notifies success", async () => {
    buildFixture();
    const { handler } = getModeHandler();
    const { ctx, notifies } = makeNotifyCtx();

    await handler("safe", ctx);

    expect(getActiveMode()).toBe("safe");
    expect(getEffectiveModeSource()).toBe("override");
    expect(notifies).toEqual([{ message: 'mode set to "safe"', type: "info" }]);
  });

  it("sets the virtual none override without requiring fragments", async () => {
    buildFixture();
    const { handler } = getModeHandler();
    const { ctx, notifies } = makeNotifyCtx();

    await handler("none", ctx);

    expect(getActiveMode()).toBe("none");
    expect(getEffectiveModeSource()).toBe("override");
    expect(notifies).toEqual([{ message: 'mode set to "none"', type: "info" }]);
  });
});

describe("/mode off — clear override", () => {
  it("clears the override; effective falls back to the default", async () => {
    buildFixture();
    setDefaultMode("safe");
    const { handler } = getModeHandler();
    const { ctx, notifies } = makeNotifyCtx();

    // First set an override, then clear it.
    await handler("safe", ctx);
    expect(getEffectiveModeSource()).toBe("override");

    await handler("off", ctx);
    expect(getActiveMode()).toBeUndefined();
    expect(getEffectiveModeSource()).toBe("default");
    expect(notifies.at(-1)?.message).toContain("safe");
    expect(notifies.at(-1)?.type).toBe("info");
  });

  it("with no default, off reverts to unset", async () => {
    buildFixture();
    const { handler } = getModeHandler();
    const { ctx, notifies } = makeNotifyCtx();

    await handler("safe", ctx);
    await handler("off", ctx);
    expect(getEffectiveModeSource()).toBe("unset");
    expect(notifies.at(-1)?.message).toContain("unset");
  });
});

describe("/mode <unknown> — graceful error", () => {
  it("notifies an error and leaves the prior override intact", async () => {
    buildFixture();
    const { handler } = getModeHandler();
    const { ctx, notifies } = makeNotifyCtx();

    // Establish a valid override first.
    await handler("safe", ctx);
    expect(getActiveMode()).toBe("safe");

    await handler("does-not-exist", ctx);

    // The prior override is intact.
    expect(getActiveMode()).toBe("safe");
    const last = notifies.at(-1)!;
    expect(last.type).toBe("error");
    expect(last.message).toMatch(/unknown preset "does-not-exist"/);
  });
});
