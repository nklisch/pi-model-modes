import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { Model } from "@earendil-works/pi-ai";
import { deriveIdentityLine } from "./identity.js";
import { getChangeSignal } from "./cache.js";
import type { ChangeSignalSnapshot, ChangeSignalEntry, ChangeReason } from "./cache.js";

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

/** Mode summary for the `Mode:` line. v1 has no mode → always "unset".
 *  `epic-mode-composition` replaces the body with axis/modifier rendering. */
export function formatModeSummary(): string {
  return "unset";
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
      const from = entry.detail.modeSignature.from || "unset";
      const to = entry.detail.modeSignature.to || "unset";
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
): string {
  const identity = model ? deriveIdentityLine(model) : "(no model)";
  const cacheKey = snapshot.currentKey ? shortHex(snapshot.currentKey) : "(none)";
  return [
    `Mode: ${formatModeSummary()}`,
    `Identity: ${identity}`,
    formatLastChanged(snapshot),
    `Cache key: ${cacheKey}`,
  ].join("\n");
}

/** The only pi seam: register `/mode:inspect`. Reads the change signal + the
 *  live model, renders, and emits a display-only message (no `triggerTurn`). */
export function registerModeInspectCommand(pi: ExtensionAPI): void {
  pi.registerCommand(MODE_INSPECT_COMMAND, {
    description:
      "Show the effective prompt's identity, last-change reason, and cache key",
    handler: async (_args: string, ctx: ExtensionCommandContext): Promise<void> => {
      const content = renderModeInspect(getChangeSignal(), ctx.model);
      pi.sendMessage({
        customType: MODE_INSPECT_MESSAGE_TYPE,
        content,
        display: true,
      });
    },
  });
}
