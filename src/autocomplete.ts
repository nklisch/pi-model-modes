import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  type AutocompleteItem,
  type AutocompleteSuggestions,
} from "@earendil-works/pi-tui";
import {
  loadPresets,
  listPresetNames,
  NONE_PRESET,
  type PresetRegistry,
} from "./presets.js";
import { formatModeSummary } from "./commands.js";

/** The literal `off` argument to `/mode` -- clears the override (NOT a preset). */
export const MODE_OFF_ARG = "off";

const OFF_DESCRIPTION = "clear override — fall back to default";
const NONE_DESCRIPTION = "explicit no-mode override — wins over default";

const MODE_ARG_TRIGGER = /^\/mode[ \t]+([^\s]*)$/;

/** PURE: extract the partial preset-name token after `/mode `, or undefined. */
export function extractModeArgToken(beforeCursor: string): string | undefined {
  return beforeCursor.match(MODE_ARG_TRIGGER)?.[1];
}

/** PURE: build the full, unfiltered suggestion item list. */
export function buildModeArgItems(
  registry: PresetRegistry = loadPresets(),
): AutocompleteItem[] {
  const presetItems: AutocompleteItem[] = listPresetNames(registry).map((name) => ({
    value: name,
    label: name,
    description:
      name === NONE_PRESET ? NONE_DESCRIPTION : formatModeSummary(registry[name]),
  }));
  return [
    ...presetItems,
    { value: MODE_OFF_ARG, label: MODE_OFF_ARG, description: OFF_DESCRIPTION },
  ];
}

/** PURE: case-insensitive prefix filter. Empty token returns all items. */
export function filterModeArgItems(
  items: AutocompleteItem[],
  token: string,
): AutocompleteItem[] {
  if (token === "") {
    return items;
  }
  const lower = token.toLowerCase();
  return items.filter((item) => item.value.toLowerCase().startsWith(lower));
}

/** PURE: return `/mode <partial>` suggestions, or null when callers should delegate. */
export function getModeArgSuggestions(
  beforeCursor: string,
  registry: PresetRegistry = loadPresets(),
): AutocompleteSuggestions | null {
  const token = extractModeArgToken(beforeCursor);
  if (token === undefined) {
    return null;
  }
  return {
    prefix: token,
    items: filterModeArgItems(buildModeArgItems(registry), token),
  };
}

export function registerModeAutocomplete(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx: ExtensionContext) => {
    if (ctx.mode !== "tui") return;
    ctx.ui.addAutocompleteProvider((current) => ({
      triggerCharacters: ["/"],
      async getSuggestions(lines, line, col, options) {
        const beforeCursor = (lines[line] ?? "").slice(0, col);
        let suggestions;
        try {
          suggestions = getModeArgSuggestions(beforeCursor);
        } catch {
          return current.getSuggestions(lines, line, col, options);
        }
        if (suggestions === null) {
          return current.getSuggestions(lines, line, col, options);
        }
        if (options.signal?.aborted) {
          return current.getSuggestions(lines, line, col, options);
        }
        return suggestions;
      },
      applyCompletion(lines, line, col, item, prefix) {
        return current.applyCompletion(lines, line, col, item, prefix);
      },
      shouldTriggerFileCompletion(lines, line, col) {
        return current.shouldTriggerFileCompletion?.(lines, line, col) ?? true;
      },
    }));
  });
}
