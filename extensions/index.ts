import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { handleBeforeAgentStart } from "../src/handler.js";
import { registerModeCommand, registerModeInspectCommand } from "../src/commands.js";
import { applySessionStart } from "../src/config.js";

/**
 * pi extension entry. The default export is the factory pi discovers and
 * calls via jiti. It receives the public ExtensionAPI.
 *
 * Registrations (single registration surface per ARCHITECTURE.md):
 *   - `before_agent_start` → `handleBeforeAgentStart` (the identity-injecting,
 *     cache-aware handler from `src/handler.ts`). Registered by reference so the
 *     unit tests can assert the registered handler is the same function object
 *     they import.
 *   - `/mode` → registered via `registerModeCommand` (the switching-path command:
 *     no arg lists the effective mode + presets; `<preset>` sets the session
 *     override; `off` reverts to the config default).
 *   - `/mode:inspect` → registered via `registerModeInspectCommand` (the
 *     plain-text status panel from `src/commands.ts` that reads the change
 *     signal + current identity).
 *   - `session_start` → `applySessionStart(e.reason, ctx.cwd)` (reconciles the
 *     DEFAULT mode tier from the plugin-owned config — global + project
 *     `pi-model-modes.json` merged — and clears the EPHEMERAL session override on
 *     a genuinely new session (`new`/`resume`/`fork`) so it restarts from the
 *     config default; a same-session `reload`/`startup` keeps any override).
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
  registerModeCommand(pi);
  registerModeInspectCommand(pi);
  pi.on("session_start", (e, ctx) => applySessionStart(e.reason, ctx.cwd));
}
