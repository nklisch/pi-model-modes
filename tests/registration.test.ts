import { describe, it, expect } from "vitest";
import factory from "../extensions/index.js";
import { handleBeforeAgentStart } from "../src/handler.js";
import { MODE_INSPECT_COMMAND } from "../src/commands.js";
import { makePi } from "./harness.js";

/**
 * Registration wiring — the factory registers the `before_agent_start` handler
 * exactly once, by reference (the same function object the unit tests import),
 * and registers the `/mode:inspect` command exactly once. Proves the "single
 * registration surface" property from ARCHITECTURE.md: the factory wires the
 * handler and the command, and nothing more.
 */
describe("factory registration wiring", () => {
  it("registers before_agent_start by reference exactly once", () => {
    const { pi, calls } = makePi();
    factory(pi);

    const registrations = calls.filter((c) => c.method === "on");
    expect(registrations).toHaveLength(1);

    const [call] = registrations;
    expect(call.args[0]).toBe("before_agent_start");
    // Registered by reference: the registered handler IS the same function
    // object the unit tests import (not an inline arrow).
    expect(call.args[1]).toBe(handleBeforeAgentStart);
  });

  it("registers the /mode:inspect command exactly once and nothing else", () => {
    const { pi, calls } = makePi();
    factory(pi);

    const commands = calls.filter((c) => c.method === "registerCommand");
    expect(commands).toHaveLength(1);
    expect(commands[0].args[0]).toBe(MODE_INSPECT_COMMAND);

    // Nothing beyond the handler `on` and the inspect command (no tools,
    // shortcuts, flags, renderers, providers, and no emit at registration).
    const unexpected = calls.filter(
      (c) => c.method !== "on" && c.method !== "registerCommand",
    );
    expect(unexpected).toHaveLength(0);
  });
});
