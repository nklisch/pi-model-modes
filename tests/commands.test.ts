import { describe, it, expect, beforeEach } from "vitest";
import {
  renderModeInspect,
  registerModeInspectCommand,
  MODE_INSPECT_COMMAND,
  MODE_INSPECT_MESSAGE_TYPE,
} from "../src/commands.js";
import { deriveIdentityLine } from "../src/identity.js";
import {
  resetCacheForTesting,
  getChangeSignal,
  setCachedResult,
  getCachedResult,
  computeCacheKey,
} from "../src/cache.js";
import type { CacheKeyInputs, ChangeSignalEntry } from "../src/cache.js";
import { handleBeforeAgentStart } from "../src/handler.js";
import { makeContext, makeEvent, makeModel, makePi } from "./harness.js";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { RecordedCall } from "./harness.js";

/**
 * `/mode:inspect` — render core (byte-exact across reasons + edges) plus the
 * registration/emission seam (the first time `commands.ts` meets `cache.ts` +
 * `identity.ts` behind the live pi command surface).
 *
 * The change signal is module-scope stateful → reset before every test.
 */
describe("renderModeInspect — render core", () => {
  beforeEach(() => resetCacheForTesting());

  /** Populate the cache via one real handler turn (the production write path). */
  function runTurn(systemPrompt: string, model = makeModel({ name: "GLM-4.6", provider: "zai" })) {
    handleBeforeAgentStart(makeEvent(systemPrompt), makeContext({ model }));
  }

  it("renders the canonical 4-line shape after a model switch", () => {
    const glm45 = makeModel({ id: "glm-4.5", name: "GLM-4.5", provider: "zai" });
    const glm46 = makeModel({ id: "glm-4.6", name: "GLM-4.6", provider: "zai" });
    runTurn("base prompt", glm45); // turn 1 — initial
    runTurn("base prompt", glm46); // turn 2 — model-switched (id changed)

    const snap = getChangeSignal();
    expect(snap.lastEntry?.reason).toBe("model-switched");

    const out = renderModeInspect(snap, glm46);
    const lines = out.split("\n");
    expect(lines[0]).toBe("Mode: unset");
    expect(lines[1]).toBe("Identity: You are GLM-4.6 from Zhipu AI.");
    expect(lines[2]).toBe(
      "Effective prompt last changed: this turn — reason: model switched",
    );
    expect(lines[3]).toBe("  (zai/glm-4.5 → zai/glm-4.6)");
    expect(lines[4]).toBe(`Cache key: ${snap.currentKey!.slice(0, 4)}...${snap.currentKey!.slice(-4)}`);
  });

  it("renders the initial population with NO parenthetical and no `undefined →`", () => {
    runTurn("base prompt");
    const snap = getChangeSignal();
    expect(snap.lastEntry?.reason).toBe("initial");

    const out = renderModeInspect(snap, makeModel({ name: "GLM-4.6", provider: "zai" }));
    expect(out).toContain(
      "Effective prompt last changed: this turn — reason: initial",
    );
    expect(out).not.toContain("undefined");
    expect(out).not.toContain("→"); // no detail parenthetical on initial
  });

  it("renders an empty ring (no turn yet) as 'never' with no cache key", () => {
    const out = renderModeInspect(getChangeSignal(), makeModel({ name: "GLM-4.6", provider: "zai" }));
    expect(out).toContain(
      "Effective prompt last changed: never (no turn has run yet)",
    );
    expect(out).toContain("Cache key: (none)");
  });

  it("renders `Cache key: (none)` when currentKey is undefined", () => {
    const snap = { currentTurn: 0, currentKey: undefined, entries: [], lastEntry: undefined };
    expect(renderModeInspect(snap, makeModel({ name: "GLM-4.6", provider: "zai" }))).toContain(
      "Cache key: (none)",
    );
  });

  it("renders `Identity: (no model)` when the model is undefined", () => {
    runTurn("base prompt");
    expect(renderModeInspect(getChangeSignal(), undefined)).toContain(
      "Identity: (no model)",
    );
  });

  it("renders the literal deriveIdentityLine for the identity field", () => {
    runTurn("base prompt");
    const model = makeModel({ name: "Claude Opus", provider: "anthropic" });
    expect(renderModeInspect(getChangeSignal(), model)).toContain(
      `Identity: ${deriveIdentityLine(model)}`,
    );
  });

  describe("turn-offset wording", () => {
    /** Build a minimal snapshot with a single entry `ago` turns in the past. */
    function snapAgo(currentTurn: number, entryTurn: number) {
      const entry: ChangeSignalEntry = {
        turn: entryTurn,
        previousKey: undefined,
        newKey: "k",
        reason: "initial",
        detail: {
          modelId: { from: undefined, to: "m" },
          modelProvider: { from: undefined, to: "p" },
          modeSignature: { from: undefined, to: "" },
          baseHash: { from: undefined, to: "h" },
        },
      };
      return { currentTurn, currentKey: "k", entries: [entry], lastEntry: entry };
    }
    const model = makeModel({ name: "GLM-4.6", provider: "zai" });

    it("'this turn' when the last change is this turn (ago 0)", () => {
      expect(renderModeInspect(snapAgo(3, 3), model)).toContain(
        "Effective prompt last changed: this turn — reason: initial",
      );
    });

    it("'1 turn ago' (singular) when ago is 1", () => {
      expect(renderModeInspect(snapAgo(4, 3), model)).toContain(
        "Effective prompt last changed: 1 turn ago — reason: initial",
      );
    });

    it("'N turns ago' (plural) when ago is greater than 1", () => {
      expect(renderModeInspect(snapAgo(7, 3), model)).toContain(
        "Effective prompt last changed: 4 turns ago — reason: initial",
      );
    });
  });

  describe("shortHex truncation (via the cache key field)", () => {
    const model = makeModel({ name: "GLM-4.6", provider: "zai" });

    it("truncates a 64-char hex key to first4...last4", () => {
      const key = "0123456789abcdef".repeat(4); // 64 chars
      const snap = { currentTurn: 1, currentKey: key, entries: [], lastEntry: undefined };
      expect(renderModeInspect(snap, model)).toContain("Cache key: 0123...cdef");
    });

    it("shows a short (<12 char) key whole", () => {
      const snap = { currentTurn: 1, currentKey: "abcdef", entries: [], lastEntry: undefined };
      expect(renderModeInspect(snap, model)).toContain("Cache key: abcdef");
    });
  });

  it("renders the base-changed detail as `(base <4>...<4> → <4>...<4>)`", () => {
    const model = makeModel({ id: "glm-4.6", name: "GLM-4.6", provider: "zai" });
    runTurn("base prompt A", model); // initial
    runTurn("base prompt B", model); // base-changed (same model/mode, new base)

    const snap = getChangeSignal();
    expect(snap.lastEntry?.reason).toBe("base-changed");

    const entry = snap.lastEntry!;
    const fromHash = entry.detail.baseHash.from!;
    const toHash = entry.detail.baseHash.to;
    const expected = `(base ${fromHash.slice(0, 4)}...${fromHash.slice(-4)} → ${toHash.slice(0, 4)}...${toHash.slice(-4)})`;

    const out = renderModeInspect(snap, model);
    expect(out).toContain("reason: base changed");
    expect(out).toContain(expected);
    expect(out).not.toContain("undefined");
  });

  it("renders the mode-switched detail as `(from → to)` with 'unset' for empty signatures", () => {
    // Direct write path: model/base constant, only the mode signature moves.
    const base: CacheKeyInputs = {
      modelId: "glm-4.6",
      modelProvider: "zai",
      modeSignature: "",
      baseSystemPrompt: "base",
    };
    const k1 = computeCacheKey(base);
    getCachedResult(k1); // advance to turn 1
    setCachedResult(k1, "r1", base); // initial

    const switched: CacheKeyInputs = { ...base, modeSignature: "flow" };
    const k2 = computeCacheKey(switched);
    getCachedResult(k2); // advance to turn 2
    setCachedResult(k2, "r2", switched); // mode-switched

    const snap = getChangeSignal();
    expect(snap.lastEntry?.reason).toBe("mode-switched");
    expect(renderModeInspect(snap, makeModel({ name: "GLM-4.6", provider: "zai" }))).toContain(
      "(unset → flow)",
    );
  });
});

describe("registerModeInspectCommand — registration + emission seam", () => {
  beforeEach(() => resetCacheForTesting());

  it("registers exactly one command named 'mode:inspect' with a description and handler", () => {
    const { pi, calls } = makePi();
    registerModeInspectCommand(pi);

    const commands = calls.filter((c) => c.method === "registerCommand");
    expect(commands).toHaveLength(1);
    const [name, options] = commands[0].args as [string, { description?: string; handler?: unknown }];
    expect(name).toBe("mode:inspect");
    expect(name).toBe(MODE_INSPECT_COMMAND);
    expect(typeof options.description).toBe("string");
    expect(options.description!.length).toBeGreaterThan(0);
    expect(typeof options.handler).toBe("function");
  });

  it("the handler reads the cache populated by the handler and emits a display-only message with no triggerTurn", async () => {
    const model = makeModel({ id: "glm-4.6", name: "GLM-4.6", provider: "zai" });

    // Seam: the handler populates the cache → inspect reads it.
    handleBeforeAgentStart(makeEvent("base prompt"), makeContext({ model }));

    const { pi, calls } = makePi();
    registerModeInspectCommand(pi);
    const command = calls.find((c) => c.method === "registerCommand")!;
    const options = command.args[1] as {
      handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
    };

    await options.handler("", makeContext({ model }) as ExtensionCommandContext);

    const sends = calls.filter((c: RecordedCall) => c.method === "sendMessage");
    expect(sends).toHaveLength(1);
    const [message, sendOptions] = sends[0].args as [
      { customType: string; content: string; display: boolean },
      { triggerTurn?: boolean } | undefined,
    ];
    expect(message.customType).toBe(MODE_INSPECT_MESSAGE_TYPE);
    expect(message.display).toBe(true);
    // Content carries the live identity line and the cache-key field.
    expect(message.content).toContain(deriveIdentityLine(model));
    expect(message.content).toContain("Cache key:");
    // Must NOT provoke a model turn: no triggerTurn option.
    expect(sendOptions?.triggerTurn).toBeUndefined();
  });
});
