import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * pi extension entry. The default export is the factory pi discovers and
 * calls via jiti. It receives the public ExtensionAPI.
 *
 * This skeleton deliberately registers NOTHING. The `before_agent_start`
 * handler is registered in the sibling feature
 * `epic-scaffold-handler-noop-handler`, which edits this file (extends the
 * body — does not overwrite it).
 *
 * Contract this feature guarantees and downstream features rely on:
 *   - default export is a function (sync or async) taking ExtensionAPI
 *   - loading the module has no side effects beyond defining the factory
 *   - the param is named `_pi` only because it is unused in the shell;
 *     the sibling feature renames it to `pi` when it starts using it.
 */
export default function (_pi: ExtensionAPI) {
  // handler registered in the noop-handler feature
}
