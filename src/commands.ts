import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { Model } from "@earendil-works/pi-ai";
import { deriveIdentityLine } from "./identity.js";
import { getChangeSignal } from "./cache.js";
import type { ChangeSignalSnapshot, ChangeSignalEntry, ChangeReason } from "./cache.js";
import {
  resolveActiveModePlan,
  setActiveMode,
  clearActiveMode,
  getActiveMode,
  getDefaultMode,
  getEffectiveModeSource,
} from "./resolver.js";
import { listPresetNames } from "./presets.js";
import type { ResolvedMode } from "./presets.js";

/**
 * `/mode:inspect` — the epic's one user-facing command surface.
 *
 * Renders a plain-text status panel (mode summary, current identity, the
 * change signal's last-change reason/detail/turn-offset, and the current cache
 * key) to the message stream by reading `getChangeSignal()` + `ctx.model`.
 *
 * Architecture mirrors the handler's split: a PURE, fully-testable render core
 * (`renderModeInspect`) with no pi coupling, plus a thin command-registration
 * wrapper (`registerModeInspectCommand`) that is the only pi seam.
 *
 * Design: `.work/active/features/epic-identity-injection-mode-inspect.md`.
 */

/** Slash command name. Colon namespacing is supported by pi (cf. `skill:name`). */
export const MODE_INSPECT_COMMAND = "mode:inspect";
/** `customType` tag for the emitted status message. */
export const MODE_INSPECT_MESSAGE_TYPE = "mode-inspect";

/** Mode summary for the `Mode:` line. `undefined` (no active mode) → "unset";
 *  a resolved mode renders `base:X • agency:Y • quality:Z • scope:W` plus a
 *  ` • +mod` suffix per modifier (preset-name prefix deferred to
 *  `epic-switching-paths`). */
export function formatModeSummary(mode: ResolvedMode | undefined): string {
  if (mode === undefined) {
    return "unset";
  }
  const axes = `base:${mode.base} • agency:${mode.agency} • quality:${mode.quality} • scope:${mode.scope}`;
  return axes + mode.modifiers.map((m) => ` • +${m}`).join("");
}

const REASON_LABEL: Record<ChangeReason, string> = {
  initial: "initial",
  "model-switched": "model switched",
  "mode-switched": "mode switched",
  "base-changed": "base changed",
};

/** Compact first4…last4 of a hex string; short strings shown whole (defensive). */
function shortHex(h: string): string {
  return h.length <= 11 ? h : `${h.slice(0, 4)}...${h.slice(-4)}`;
}

/** Parenthetical detail line for a change entry, or "" when there is nothing
 *  meaningful to show. NEVER renders `undefined → …`. */
function formatChangeDetail(entry: ChangeSignalEntry): string {
  switch (entry.reason) {
    case "initial":
      return ""; // first population — no from-state to show
    case "model-switched": {
      const from = `${entry.detail.modelProvider.from ?? "?"}/${entry.detail.modelId.from ?? "?"}`;
      const to = `${entry.detail.modelProvider.to}/${entry.detail.modelId.to}`;
      return `(${from} → ${to})`;
    }
    case "mode-switched": {
      // Real composed signatures are 64-char hashes — shorten them (empty "" →
      // "unset") so the detail line stays readable.
      const from = entry.detail.modeSignature.from ? shortHex(entry.detail.modeSignature.from) : "unset";
      const to = entry.detail.modeSignature.to ? shortHex(entry.detail.modeSignature.to) : "unset";
      return `(${from} → ${to})`;
    }
    case "base-changed": {
      const from = entry.detail.baseHash.from ? shortHex(entry.detail.baseHash.from) : "?";
      return `(base ${from} → ${shortHex(entry.detail.baseHash.to)})`;
    }
  }
}

/** The "Effective prompt last changed: …" block (1 or 2 lines). */
function formatLastChanged(snapshot: ChangeSignalSnapshot): string {
  const last = snapshot.lastEntry;
  if (last === undefined) {
    return "Effective prompt last changed: never (no turn has run yet)";
  }
  const ago = snapshot.currentTurn - last.turn;
  const when = ago <= 0 ? "this turn" : ago === 1 ? "1 turn ago" : `${ago} turns ago`;
  const head = `Effective prompt last changed: ${when} — reason: ${REASON_LABEL[last.reason]}`;
  const detail = formatChangeDetail(last);
  return detail ? `${head}\n  ${detail}` : head;
}

/** PURE: build the plain-text inspect panel. No pi coupling → fully unit-tested. */
export function renderModeInspect(
  snapshot: ChangeSignalSnapshot,
  model: Model<any> | undefined,
  mode: ResolvedMode | undefined,
  modeError?: string,
): string {
  const identity = model ? deriveIdentityLine(model) : "(no model)";
  const cacheKey = snapshot.currentKey ? shortHex(snapshot.currentKey) : "(none)";
  const modeLine = modeError
    ? `(unresolvable — ${modeError})`
    : formatModeSummary(mode);
  return [
    `Mode: ${modeLine}`,
    `Identity: ${identity}`,
    formatLastChanged(snapshot),
    `Cache key: ${cacheKey}`,
  ].join("\n");
}

/** Slash command name for the `/mode` command family. */
export const MODE_COMMAND = "mode";
/** `customType` tag for the `/mode` no-arg listing message. */
export const MODE_LISTING_MESSAGE_TYPE = "mode";

/**
 * PURE: build the `/mode` (no-arg) listing panel. Shows the EFFECTIVE mode
 * (source tier + the effective spec name + composed axes summary) and the
 * available presets. No pi coupling → fully unit-tested.
 *
 *   `source`   — `getEffectiveModeSource()` ("override" | "default" | "unset").
 *   `specName` — the effective spec name (`getActiveMode() ?? getDefaultMode()`)
 *                when it is a string preset name; `undefined` for an explicit
 *                object spec or no mode (the summary line still conveys the axes).
 *   `mode`     — `resolveActiveModePlan().mode` (the resolved axes), or
 *                `undefined` for no mode.
 *   `modeError`— set when the resolve threw (a broken active mode); renders an
 *                error line instead of crashing the listing.
 *   `presets`  — sorted preset names, including virtual `none`.
 */
export function formatModeListing(
  source: "override" | "default" | "unset",
  specName: string | undefined,
  mode: ResolvedMode | undefined,
  modeError: string | undefined,
  presets: readonly string[],
): string {
  const label = specName ? `${specName} (${source})` : source;
  const summary = modeError
    ? `(unresolvable — ${modeError})`
    : formatModeSummary(mode);
  const presetList =
    presets.length > 0 ? presets.map((p) => `  - ${p}`).join("\n") : "  (none)";
  return [
    `Effective mode: ${label}`,
    `  ${summary}`,
    "Available presets:",
    presetList,
  ].join("\n");
}

/**
 * The `/mode` command family — the interactive switching path.
 *   - no arg → emit a display-only listing panel (effective mode + presets).
 *   - `off`  → `clearActiveMode()` (override falls back to the config default
 *              per the precedence layer); notify the new effective state.
 *   - a name → `setActiveMode(arg)` (validated at set-time); success notifies,
 *              failure surfaces the resolver error and leaves prior override
 *              intact.
 */
export function registerModeCommand(pi: ExtensionAPI): void {
  pi.registerCommand(MODE_COMMAND, {
    description:
      "Show or set the session mode (no arg lists; <preset> sets; off reverts to default)",
    handler: async (args: string, ctx: ExtensionCommandContext): Promise<void> => {
      const arg = args?.trim() ?? "";

      // No arg → emit the listing panel.
      if (arg === "") {
        const source = getEffectiveModeSource();
        const effectiveSpec = getActiveMode() ?? getDefaultMode();
        const specName = typeof effectiveSpec === "string" ? effectiveSpec : undefined;
        let mode: ResolvedMode | undefined;
        let modeError: string | undefined;
        try {
          mode = resolveActiveModePlan().mode;
        } catch (err) {
          modeError = (err as Error).message;
        }
        const presets = listPresetNames();
        pi.sendMessage({
          customType: MODE_LISTING_MESSAGE_TYPE,
          content: formatModeListing(source, specName, mode, modeError, presets),
          display: true,
        });
        return;
      }

      // `off` → clear the override; effective falls back to the config default.
      if (arg === "off") {
        clearActiveMode();
        const source = getEffectiveModeSource();
        const effectiveSpec = getActiveMode() ?? getDefaultMode();
        const specName = typeof effectiveSpec === "string" ? effectiveSpec : undefined;
        const state =
          source === "unset"
            ? "override cleared — mode unset"
            : `override cleared — mode now ${specName ?? source} (${source})`;
        ctx.ui.notify(state, "info");
        return;
      }

      // A name → set the override (validated at set-time by the resolver).
      try {
        setActiveMode(arg);
        ctx.ui.notify(`mode set to "${arg}"`, "info");
      } catch (err) {
        ctx.ui.notify((err as Error).message, "error");
      }
    },
  });
}

/** The only pi seam: register `/mode:inspect`. Reads the change signal + the
 *  live model, renders, and emits a display-only message (no `triggerTurn`). */
export function registerModeInspectCommand(pi: ExtensionAPI): void {
  pi.registerCommand(MODE_INSPECT_COMMAND, {
    description:
      "Show the effective prompt's identity, last-change reason, and cache key",
    handler: async (_args: string, ctx: ExtensionCommandContext): Promise<void> => {
      // Resolve the active mode (the resolved axes, NOT a raw preset string).
      // A fragment that vanished after `setActiveMode` would throw here — catch
      // it so the diagnostic command degrades to a graceful unresolvable line.
      let mode: ResolvedMode | undefined;
      let modeError: string | undefined;
      try {
        mode = resolveActiveModePlan().mode;
      } catch (err) {
        modeError = (err as Error).message;
      }
      const content = renderModeInspect(getChangeSignal(), ctx.model, mode, modeError);
      pi.sendMessage({
        customType: MODE_INSPECT_MESSAGE_TYPE,
        content,
        display: true,
      });
    },
  });
}
