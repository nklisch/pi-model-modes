import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  setActiveMode,
  getActiveMode,
  getDefaultMode,
} from "./resolver.js";
import { loadPresets } from "./presets.js";

/**
 * Mode-cycle keybindings — the keyboard switching path. `Ctrl+M` cycles
 * FORWARD through the sorted preset list and `Shift+Ctrl+M` cycles BACKWARD,
 * each setting the session OVERRIDE (via the resolver seam) relative to the
 * current EFFECTIVE mode. User-rebindable via `~/.pi/agent/keybindings.json`.
 *
 * The cycle math (`nextPresetName`) is a PURE helper — fully unit-testable
 * without pi. `registerModeKeybindings` is the thin pi seam.
 *
 * `Key` import note: the reference `preset.ts` imports `Key` from
 * `@earendil-works/pi-tui` (`Key.ctrl("m")`). That package is NOT a direct
 * dependency of this plugin (it lives nested under `pi-coding-agent`'s own
 * node_modules, not hoisted/resolvable from here), so importing it would not
 * resolve under NodeNext + `verbatimModuleSyntax`. We use the equivalent
 * `KeyId` STRING form instead — `"ctrl+m"` / `"ctrl+shift+m"` — which are valid
 * members of pi's `KeyId` union and typecheck against `registerShortcut`'s
 * `shortcut: KeyId` parameter without the extra dependency.
 *
 * Design: `.work/active/features/epic-switching-paths-keybinding-cycle.md`.
 */

/** KeyId for forward cycle (Ctrl+M). The user-rebindable default. */
export const CYCLE_FORWARD_KEY = "ctrl+m";
/** KeyId for backward cycle (Shift+Ctrl+M). The user-rebindable default. */
export const CYCLE_BACKWARD_KEY = "ctrl+shift+m";

/**
 * PURE: the next preset name when cycling through a SORTED preset list.
 *
 *   - empty list → `undefined` (no-op at the caller).
 *   - `current` found at index `i` → forward `(i+1) % len`, backward
 *     `(i-1+len) % len` (wraps at both ends).
 *   - `current` unset or not a preset name (`indexOf` → -1) → enter the list at
 *     `names[0]` going forward, `names[len-1]` going backward.
 */
export function nextPresetName(
  names: string[],
  current: string | undefined,
  dir: 1 | -1,
): string | undefined {
  const len = names.length;
  if (len === 0) {
    return undefined;
  }
  const idx = current === undefined ? -1 : names.indexOf(current);
  if (idx === -1) {
    // From unset / a non-preset spec: forward → first, backward → last.
    return dir === 1 ? names[0] : names[len - 1];
  }
  const next = (idx + dir + len) % len;
  return names[next];
}

/**
 * Register the forward/backward mode-cycle shortcuts. Each handler computes the
 * sorted preset names, derives the current EFFECTIVE spec name
 * (`getActiveMode() ?? getDefaultMode()`, only when it's a string preset), picks
 * the next preset via `nextPresetName`, then `setActiveMode(next)` +
 * `ctx.ui.notify('mode: <next>')`. An empty preset list notifies "no presets".
 */
export function registerModeKeybindings(pi: ExtensionAPI): void {
  const cycle = (dir: 1 | -1) => async (ctx: ExtensionContext): Promise<void> => {
    const names = Object.keys(loadPresets()).sort();
    if (names.length === 0) {
      ctx.ui.notify("no presets", "info");
      return;
    }
    const effective = getActiveMode() ?? getDefaultMode();
    const current = typeof effective === "string" ? effective : undefined;
    const next = nextPresetName(names, current, dir);
    if (next === undefined) {
      // Defensive: names is non-empty above, so this is unreachable.
      ctx.ui.notify("no presets", "info");
      return;
    }
    setActiveMode(next);
    ctx.ui.notify(`mode: ${next}`, "info");
  };

  pi.registerShortcut(CYCLE_FORWARD_KEY, {
    description: "Cycle to the next mode preset",
    handler: cycle(1),
  });
  pi.registerShortcut(CYCLE_BACKWARD_KEY, {
    description: "Cycle to the previous mode preset",
    handler: cycle(-1),
  });
}
