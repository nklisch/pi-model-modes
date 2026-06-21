import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { handleBeforeAgentStart } from "../src/handler.js";

/**
 * pi extension entry. The default export is the factory pi discovers and
 * calls via jiti. It receives the public ExtensionAPI.
 *
 * Registrations (single registration surface per ARCHITECTURE.md):
 *   - `before_agent_start` → `handleBeforeAgentStart` (the no-op handler from
 *     `src/handler.ts`). Registered by reference so the unit tests can assert
 *     the registered handler is the same function object they import.
 *
 * Downstream epics extend this factory (register `/mode`, keybindings, etc.)
 * by adding more `pi.on(...)` / `pi.registerCommand(...)` calls — edit, don't
 * overwrite.
 *
 * Contract this feature guarantees and downstream features rely on:
 *   - default export is a function (sync or async) taking ExtensionAPI
 *   - loading the module has no side effects beyond defining the factory
 *     (the handler is only registered when pi invokes the factory)
 */
export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", handleBeforeAgentStart);
}
