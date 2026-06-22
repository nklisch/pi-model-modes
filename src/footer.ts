import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ResolvedMode } from "./presets.js";
import {
  getEffectiveModeSource,
  getActiveMode,
  getDefaultMode,
  resolveActiveModePlan,
} from "./resolver.js";
import { CYCLE_FORWARD_KEY, CYCLE_BACKWARD_KEY } from "./keybinding.js";

/** The setStatus key: one slot gives this plugin control over its footer blob. */
export const MODE_FOOTER_KEY = "pi-model-modes";

/** PURE inputs to the footer render (no pi coupling). */
export interface ModeFooterInputs {
  /** Reserved for future footer use; not rendered in v1. */
  source: "override" | "default" | "unset";
  /** Effective preset name when the spec is a string preset. */
  specName: string | undefined;
  /** Resolved axes; undefined means no effective mode. */
  mode: ResolvedMode | undefined;
  /** Broken active/default mode; wins over a resolved mode. */
  modeError: string | undefined;
  /** Whether cycle keybindings are registered and the footer hint is honest. */
  cycleHintEnabled: boolean;
  /** Forward cycle key text, forwarded verbatim from the keybinding seam. */
  cycleForwardKey: string;
  /** Backward cycle key text, forwarded verbatim from the keybinding seam. */
  cycleBackwardKey: string;
}

/** PURE: build the one-line footer string. Always returns a string. */
export function formatModeFooter(inputs: ModeFooterInputs): string {
  let indicator: string;
  if (inputs.modeError !== undefined) {
    indicator = "mode: (unresolvable)";
  } else if (inputs.mode === undefined) {
    indicator = "mode: unset";
  } else if (inputs.specName !== undefined) {
    indicator = `mode: ${inputs.specName}`;
  } else {
    indicator = `mode: ${inputs.mode.base}/${inputs.mode.agency}/${inputs.mode.quality}/${inputs.mode.scope}`;
  }

  if (inputs.modeError === undefined && inputs.mode !== undefined && inputs.mode.modifiers.length > 0) {
    indicator += ` +${inputs.mode.modifiers.length}`;
  }

  if (!inputs.cycleHintEnabled) {
    return indicator;
  }
  return `${indicator} · ${inputs.cycleForwardKey}/${inputs.cycleBackwardKey} cycle`;
}

let cycleHintEnabled = false;

/** Factory-only: enable/disable the cycle hint. */
export function setCycleHintEnabled(b: boolean): void {
  cycleHintEnabled = b;
}

/** TEST-ONLY: reset module-scope footer state. */
export function resetFooterForTesting(): void {
  cycleHintEnabled = false;
}

/**
 * Thin pi seam. UI-only side effect: reads resolver state and pushes the
 * formatted footer string. No prompt, cache, splice, or resolver mutation.
 */
export function refreshModeFooter(ctx: ExtensionContext): void {
  if (!ctx.hasUI) {
    return;
  }

  const source = getEffectiveModeSource();
  const spec = getActiveMode() ?? getDefaultMode();
  const specName = typeof spec === "string" ? spec : undefined;
  let mode: ResolvedMode | undefined;
  let modeError: string | undefined;
  try {
    mode = resolveActiveModePlan().mode;
  } catch (err) {
    modeError = (err as Error).message;
  }

  ctx.ui.setStatus(
    MODE_FOOTER_KEY,
    formatModeFooter({
      source,
      specName,
      mode,
      modeError,
      cycleHintEnabled,
      cycleForwardKey: CYCLE_FORWARD_KEY,
      cycleBackwardKey: CYCLE_BACKWARD_KEY,
    }),
  );
}
