import { describe, it, expect } from "vitest";
import {
  MODE_OFF_ARG,
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
