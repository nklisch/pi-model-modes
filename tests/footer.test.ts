import { beforeEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  MODE_FOOTER_KEY,
  formatModeFooter,
  refreshModeFooter,
  resetFooterForTesting,
  setCycleHintEnabled,
  type ModeFooterInputs,
} from "../src/footer.js";
import { CYCLE_BACKWARD_KEY, CYCLE_FORWARD_KEY } from "../src/keybinding.js";
import type { ResolvedMode } from "../src/presets.js";
import {
  getActiveMode,
  getDefaultMode,
  resetResolverForTesting,
  setActiveMode,
  setDefaultMode,
} from "../src/resolver.js";
import { getChangeSignal, resetCacheForTesting } from "../src/cache.js";
import { makeContext } from "./harness.js";

const mode: ResolvedMode = {
  base: "pi",
  agency: "autonomous",
  quality: "architect",
  scope: "unrestricted",
  modifiers: [],
};

function inputs(overrides: Partial<ModeFooterInputs> = {}): ModeFooterInputs {
  return {
    source: "override",
    specName: undefined,
    mode,
    modeError: undefined,
    cycleHintEnabled: false,
    cycleForwardKey: CYCLE_FORWARD_KEY,
    cycleBackwardKey: CYCLE_BACKWARD_KEY,
    ...overrides,
  };
}

describe("formatModeFooter", () => {
  it("renders a preset name for a string preset spec", () => {
    expect(formatModeFooter(inputs({ specName: "partner" }))).toBe(
      "mode: partner",
    );
  });

  it("renders compact axes for an explicit object spec", () => {
    expect(formatModeFooter(inputs())).toBe(
      "mode: pi/autonomous/architect/unrestricted",
    );
  });

  it("renders a +N modifier suffix for preset and object modes", () => {
    const withMods = { ...mode, modifiers: ["flow", "tdd"] };

    expect(
      formatModeFooter(inputs({ specName: "refactor", mode: withMods })),
    ).toBe("mode: refactor +2");
    expect(formatModeFooter(inputs({ mode: withMods }))).toBe(
      "mode: pi/autonomous/architect/unrestricted +2",
    );
  });

  it("renders unset when no mode resolves", () => {
    expect(formatModeFooter(inputs({ source: "unset", mode: undefined }))).toBe(
      "mode: unset",
    );
  });

  it("renders unresolvable when modeError is set, winning over a defined mode", () => {
    const withMods = { ...mode, modifiers: ["flow"] };
    expect(
      formatModeFooter(
        inputs({
          specName: "refactor",
          mode: withMods,
          modeError: 'mode agency "ghost" has no fragment file',
        }),
      ),
    ).toBe("mode: (unresolvable)");
  });

  it("appends the cycle hint in every state when enabled", () => {
    const hint = ` · ${CYCLE_FORWARD_KEY}/${CYCLE_BACKWARD_KEY} cycle`;
    const withMods = { ...mode, modifiers: ["flow"] };

    expect(
      formatModeFooter(
        inputs({ specName: "partner", cycleHintEnabled: true }),
      ),
    ).toBe(`mode: partner${hint}`);
    expect(formatModeFooter(inputs({ cycleHintEnabled: true }))).toBe(
      `mode: pi/autonomous/architect/unrestricted${hint}`,
    );
    expect(
      formatModeFooter(
        inputs({ mode: withMods, cycleHintEnabled: true }),
      ),
    ).toBe(`mode: pi/autonomous/architect/unrestricted +1${hint}`);
    expect(
      formatModeFooter(
        inputs({ source: "unset", mode: undefined, cycleHintEnabled: true }),
      ),
    ).toBe(`mode: unset${hint}`);
    expect(
      formatModeFooter(
        inputs({ modeError: "broken", cycleHintEnabled: true }),
      ),
    ).toBe(`mode: (unresolvable)${hint}`);
  });

  it("omits the cycle hint when disabled", () => {
    expect(
      formatModeFooter(
        inputs({
          source: "unset",
          mode: undefined,
          cycleHintEnabled: false,
        }),
      ),
    ).not.toContain("cycle");
  });

  it("renders passed cycle key tokens verbatim", () => {
    expect(
      formatModeFooter(
        inputs({
          mode: undefined,
          cycleHintEnabled: true,
          cycleForwardKey: "x+y",
          cycleBackwardKey: "a+b+c",
        }),
      ),
    ).toBe("mode: unset · x+y/a+b+c cycle");
  });
});

describe("refreshModeFooter", () => {
  beforeEach(() => {
    resetFooterForTesting();
    resetResolverForTesting();
    resetCacheForTesting();
  });

  it("is a no-op when ctx.hasUI is false", () => {
    const calls: unknown[] = [];
    const ctx = makeContext({
      hasUI: false,
      ui: {
        setStatus: (...args: unknown[]) => {
          calls.push(args);
        },
      },
    } as unknown as Partial<ExtensionContext>);

    refreshModeFooter(ctx);

    expect(calls).toHaveLength(0);
  });

  it("calls setStatus exactly once when ctx.hasUI is true", () => {
    const calls: [string, string | undefined][] = [];
    const ctx = makeContext({
      hasUI: true,
      ui: {
        setStatus: (key: string, text: string | undefined) => {
          calls.push([key, text]);
        },
      },
    } as unknown as Partial<ExtensionContext>);

    refreshModeFooter(ctx);

    expect(calls).toEqual([[MODE_FOOTER_KEY, "mode: unset"]]);
  });

  it("uses the module cycle-hint signal when rendering through the seam", () => {
    const calls: [string, string | undefined][] = [];
    const ctx = makeContext({
      hasUI: true,
      ui: {
        setStatus: (key: string, text: string | undefined) => {
          calls.push([key, text]);
        },
      },
    } as unknown as Partial<ExtensionContext>);

    setCycleHintEnabled(true);
    refreshModeFooter(ctx);

    expect(calls).toEqual([
      [
        MODE_FOOTER_KEY,
        `mode: unset · ${CYCLE_FORWARD_KEY}/${CYCLE_BACKWARD_KEY} cycle`,
      ],
    ]);
  });

  it("does not advance cache turns or mutate resolver state", () => {
    setActiveMode("none");
    setDefaultMode("none");
    const activeBefore = getActiveMode();
    const defaultBefore = getDefaultMode();
    const turnBefore = getChangeSignal().currentTurn;
    const calls: [string, string | undefined][] = [];
    const ctx = makeContext({
      hasUI: true,
      ui: {
        setStatus: (key: string, text: string | undefined) => {
          calls.push([key, text]);
        },
      },
    } as unknown as Partial<ExtensionContext>);

    refreshModeFooter(ctx);

    expect(getChangeSignal().currentTurn).toBe(turnBefore);
    expect(getActiveMode()).toEqual(activeBefore);
    expect(getDefaultMode()).toEqual(defaultBefore);
    expect(calls).toHaveLength(1);
  });
});
