import { describe, it, expect, vi } from "vitest";
import type {
  AutocompleteProviderFactory,
  ExtensionContext,
  SessionStartEvent,
} from "@earendil-works/pi-coding-agent";
import type { AutocompleteProvider } from "@earendil-works/pi-tui";
import {
  MODE_OFF_ARG,
  registerModeAutocomplete,
  extractModeArgToken,
  buildModeArgItems,
  filterModeArgItems,
  getModeArgSuggestions,
} from "../src/autocomplete.js";
import {
  loadPresets,
  listPresetNames,
  NONE_PRESET,
  type PresetRegistry,
} from "../src/presets.js";
import { formatModeSummary } from "../src/commands.js";
import { makeContext, makePi } from "./harness.js";

const FIXTURE_JSON = JSON.stringify({
  flow: {
    base: "flow",
    agency: "autonomous",
    quality: "architect",
    scope: "adjacent",
    modifiers: ["flow"],
  },
  safe: {
    base: "pi",
    agency: "collaborative",
    quality: "minimal",
    scope: "narrow",
    modifiers: [],
  },
  extend: {
    base: "pi",
    agency: "autonomous",
    quality: "pragmatic",
    scope: "adjacent",
    modifiers: [],
  },
});

const NONE_DESCRIPTION = "explicit no-mode override — wins over default";
const OFF_DESCRIPTION = "clear override — fall back to default";

function fixtureRegistry(): PresetRegistry {
  return loadPresets({ json: FIXTURE_JSON });
}

const SESSION_START_EVENT: SessionStartEvent = {
  type: "session_start",
  reason: "startup",
};

function registeredModeAutocompleteHandler(
  piCalls: ReturnType<typeof makePi>["calls"],
): (event: SessionStartEvent, ctx: ExtensionContext) => void {
  const registrations = piCalls.filter(
    (call) => call.method === "on" && call.args[0] === "session_start",
  );
  expect(registrations).toHaveLength(1);
  return registrations[0].args[1] as (
    event: SessionStartEvent,
    ctx: ExtensionContext,
  ) => void;
}

function recordingAutocompleteContext(): {
  ctx: ExtensionContext;
  factories: AutocompleteProviderFactory[];
} {
  const factories: AutocompleteProviderFactory[] = [];
  const ctx = makeContext({
    mode: "tui",
    ui: {
      addAutocompleteProvider: (factory: AutocompleteProviderFactory) => {
        factories.push(factory);
      },
    },
  } as unknown as Partial<ExtensionContext>);
  return { ctx, factories };
}

function currentProvider(): {
  current: AutocompleteProvider;
  calls: { getSuggestions: number; applyCompletion: number; shouldTrigger: number };
} {
  const calls = { getSuggestions: 0, applyCompletion: 0, shouldTrigger: 0 };
  return {
    calls,
    current: {
      async getSuggestions() {
        calls.getSuggestions += 1;
        return {
          prefix: "sentinel",
          items: [{ value: "sentinel", label: "sentinel" }],
        };
      },
      applyCompletion(lines, _line, _col, item) {
        calls.applyCompletion += 1;
        return {
          lines: [...lines, item.value],
          cursorLine: lines.length,
          cursorCol: item.value.length,
        };
      },
      shouldTriggerFileCompletion() {
        calls.shouldTrigger += 1;
        return false;
      },
    },
  };
}

describe("extractModeArgToken", () => {
  it("extracts the token for `/mode <partial>` lines", () => {
    expect(extractModeArgToken("/mode ")).toBe("");
    expect(extractModeArgToken("/mode fl")).toBe("fl");
    expect(extractModeArgToken("/mode flow")).toBe("flow");
  });

  it("returns undefined when the line is not a single `/mode <partial>` invocation", () => {
    expect(extractModeArgToken("/mode")).toBeUndefined();
    expect(extractModeArgToken("/mode:inspect ")).toBeUndefined();
    expect(extractModeArgToken("/model fl")).toBeUndefined();
    expect(extractModeArgToken("/mode flow extra")).toBeUndefined();
    expect(extractModeArgToken("")).toBeUndefined();
    expect(extractModeArgToken("some text")).toBeUndefined();
  });
});

describe("buildModeArgItems", () => {
  it("returns one item per preset name, then the off literal", () => {
    const registry = fixtureRegistry();
    const names = listPresetNames(registry);
    const items = buildModeArgItems(registry);

    expect(items).toHaveLength(names.length + 1);
    expect(items.map((item) => item.value)).toEqual([...names, MODE_OFF_ARG]);
    expect(items.map((item) => item.label)).toEqual([...names, MODE_OFF_ARG]);
  });

  it("describes real presets via formatModeSummary and keeps none/off tier-distinct", () => {
    const registry = fixtureRegistry();
    const items = buildModeArgItems(registry);

    for (const name of listPresetNames(registry)) {
      const item = items.find((candidate) => candidate.value === name);
      expect(item, name).toBeDefined();
      expect(item?.label, name).toBe(name);
      if (name === NONE_PRESET) {
        expect(item?.description).toBe(NONE_DESCRIPTION);
      } else {
        expect(item?.description).toBe(formatModeSummary(registry[name]));
      }
    }

    expect(items.at(-1)).toEqual({
      value: MODE_OFF_ARG,
      label: MODE_OFF_ARG,
      description: OFF_DESCRIPTION,
    });
  });
});

describe("filterModeArgItems", () => {
  it("uses a case-insensitive prefix match", () => {
    const items = buildModeArgItems(fixtureRegistry());

    expect(filterModeArgItems(items, "")).toEqual(items);
    expect(filterModeArgItems(items, "fl")).toEqual([
      expect.objectContaining({ value: "flow" }),
    ]);
    expect(filterModeArgItems(items, "FL")).toEqual(
      filterModeArgItems(items, "fl"),
    );
    expect(filterModeArgItems(items, "zzz")).toEqual([]);
  });
});

describe("getModeArgSuggestions", () => {
  it("returns prefix-scoped mode argument suggestions for `/mode <partial>`", () => {
    const registry = fixtureRegistry();
    const flowItem = buildModeArgItems(registry).find(
      (item) => item.value === "flow",
    );
    expect(flowItem).toBeDefined();

    expect(getModeArgSuggestions("/mode fl", registry)).toEqual({
      prefix: "fl",
      items: [flowItem],
    });
  });

  it("returns null when the trigger does not match", () => {
    expect(getModeArgSuggestions("/mode", fixtureRegistry())).toBeNull();
  });
});

describe("registerModeAutocomplete", () => {
  it("registers exactly one session_start handler and no other pi surface", () => {
    const { pi, calls } = makePi();

    registerModeAutocomplete(pi);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("on");
    expect(calls[0].args[0]).toBe("session_start");
    expect(typeof calls[0].args[1]).toBe("function");
  });

  it("registers a TUI autocomplete provider that delegates completion behavior", () => {
    const { pi, calls } = makePi();
    registerModeAutocomplete(pi);
    const handler = registeredModeAutocompleteHandler(calls);
    const { ctx, factories } = recordingAutocompleteContext();

    handler(SESSION_START_EVENT, ctx);

    expect(factories).toHaveLength(1);
    const { current, calls: providerCalls } = currentProvider();
    const provider = factories[0](current);
    expect(provider.triggerCharacters).toEqual(["/"]);

    const completion = provider.applyCompletion(
      ["/mode fl"],
      0,
      8,
      { value: "flow", label: "flow" },
      "fl",
    );
    expect(providerCalls.applyCompletion).toBe(1);
    expect(completion).toEqual({
      lines: ["/mode fl", "flow"],
      cursorLine: 1,
      cursorCol: 4,
    });

    expect(provider.shouldTriggerFileCompletion?.(["/mode fl"], 0, 8)).toBe(false);
    expect(providerCalls.shouldTrigger).toBe(1);
  });

  it("does not add a provider outside TUI mode", () => {
    const { pi, calls } = makePi();
    registerModeAutocomplete(pi);
    const handler = registeredModeAutocompleteHandler(calls);
    const addAutocompleteProvider = vi.fn();
    const ctx = makeContext({
      mode: "print",
      ui: { addAutocompleteProvider },
    } as unknown as Partial<ExtensionContext>);

    handler(SESSION_START_EVENT, ctx);

    expect(addAutocompleteProvider).not.toHaveBeenCalled();
  });

  it("delegates suggestions when the line is not a `/mode <partial>` invocation", async () => {
    const { pi, calls } = makePi();
    registerModeAutocomplete(pi);
    const handler = registeredModeAutocompleteHandler(calls);
    const { ctx, factories } = recordingAutocompleteContext();
    handler(SESSION_START_EVENT, ctx);
    const { current, calls: providerCalls } = currentProvider();
    const provider = factories[0](current);

    const result = await provider.getSuggestions(["hello"], 0, 5, {
      signal: new AbortController().signal,
    });

    expect(providerCalls.getSuggestions).toBe(1);
    expect(result).toEqual({
      prefix: "sentinel",
      items: [{ value: "sentinel", label: "sentinel" }],
    });
  });

  it("returns `/mode` suggestions without delegating when the trigger matches", async () => {
    const { pi, calls } = makePi();
    registerModeAutocomplete(pi);
    const handler = registeredModeAutocompleteHandler(calls);
    const { ctx, factories } = recordingAutocompleteContext();
    handler(SESSION_START_EVENT, ctx);
    const { current, calls: providerCalls } = currentProvider();
    const provider = factories[0](current);

    const result = await provider.getSuggestions(["/mode fl"], 0, 8, {
      signal: new AbortController().signal,
    });

    expect(providerCalls.getSuggestions).toBe(0);
    expect(result?.prefix).toBe("fl");
    expect(result?.items).toEqual([
      expect.objectContaining({ value: "flow", label: "flow" }),
    ]);
  });
});
