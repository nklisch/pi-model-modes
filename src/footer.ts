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

/**
 * Leading marker glyph per base voice. Echoes pi-catppuccin-tui's ◆ vocabulary
 * so the mode footer reads as part of the same family as the model/git/cost
 * line rather than a foreign symbol. Glyph choice tracks voice *character*:
 * solid for pi-family voices (default `pi` and the more-terse `pi-direct`),
 * outline for `chill`'s softer voice, hex for `flow`'s distinct character.
 *
 * Plain Unicode — not ANSI — because pi-bar's status pipeline runs every
 * extension status through `stripTerminalControls` (which drops every ANSI
 * escape) before re-wrapping it in a single fixed `theme.fg("text", …)`. Glyphs
 * survive that pipeline; embedded colors would render as plain text.
 */
const BASE_VOICE_GLYPHS: Readonly<Record<string, string>> = {
  pi: "◆",
  "pi-direct": "◆",
  chill: "◇",
  flow: "⬡",
};

/** Distinct error glyph for an unresolvable mode; wins over any partial mode. */
const UNRESOLVABLE_GLYPH = "✕";

/** Fallback when no mode is active or the base is unrecognized. */
const DEFAULT_GLYPH = "◆";

/**
 * PURE: glyph for a base voice, with a default fallback for unset / unknown
 * bases (forward-compat for new base voices added later). Used directly by
 * callers that know a base but not the full `ModeFooterInputs` shape (e.g. the
 * cycle-keybinding toast, which matches the footer's leading glyph so the
 * toast and the footer agree visually).
 */
export function glyphForBase(base: string | undefined): string {
  if (base === undefined) return DEFAULT_GLYPH;
  return BASE_VOICE_GLYPHS[base] ?? DEFAULT_GLYPH;
}

/**
 * PURE: pick the leading footer glyph for the current state.
 *
 * Precedence mirrors the indicator itself: modeError wins, then unset falls
 * back to the default glyph, then the per-base-voice map.
 */
export function selectModeGlyph(inputs: ModeFooterInputs): string {
  if (inputs.modeError !== undefined) return UNRESOLVABLE_GLYPH;
  return glyphForBase(inputs.mode?.base);
}

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
  const glyph = selectModeGlyph(inputs);
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
  indicator = `${glyph} ${indicator}`;

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
