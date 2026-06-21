import { describe, it, expect } from "vitest";
import factory from "../extensions/index.js";
import { handleBeforeAgentStart } from "../src/handler.js";
import { MODE_COMMAND, MODE_INSPECT_COMMAND } from "../src/commands.js";
import {
  CYCLE_FORWARD_KEY,
  CYCLE_BACKWARD_KEY,
} from "../src/keybinding.js";
import { makePi } from "./harness.js";

/**
 * Registration wiring — the factory registers the `before_agent_start` handler
 * exactly once, by reference (the same function object the unit tests import),
 * the `session_start` config-seed once, and the `/mode:inspect` command once.
 * Proves the "single registration surface" property from ARCHITECTURE.md: the
 * factory wires the handler, the session-start seed, and the command, and
 * nothing more.
 */
describe("factory registration wiring", () => {
  it("registers before_agent_start by reference exactly once", () => {
    const { pi, calls } = makePi();
    factory(pi);

    const registrations = calls.filter(
      (c) => c.method === "on" && c.args[0] === "before_agent_start",
    );
    expect(registrations).toHaveLength(1);

    const [call] = registrations;
    expect(call.args[0]).toBe("before_agent_start");
    // Registered by reference: the registered handler IS the same function
    // object the unit tests import (not an inline arrow).
    expect(call.args[1]).toBe(handleBeforeAgentStart);
  });

  it("registers a session_start handler exactly once", () => {
    const { pi, calls } = makePi();
    factory(pi);

    const registrations = calls.filter(
      (c) => c.method === "on" && c.args[0] === "session_start",
    );
    expect(registrations).toHaveLength(1);
    expect(typeof registrations[0].args[1]).toBe("function");
  });

  it("registers the /mode + /mode:inspect commands and nothing unexpected", () => {
    const { pi, calls } = makePi();
    factory(pi);

    const commands = calls
      .filter((c) => c.method === "registerCommand")
      .map((c) => c.args[0])
      .sort();
    expect(commands).toEqual([MODE_COMMAND, MODE_INSPECT_COMMAND].sort());

    // The only `on` registrations are before_agent_start + session_start.
    const events = calls
      .filter((c) => c.method === "on")
      .map((c) => c.args[0])
      .sort();
    expect(events).toEqual(["before_agent_start", "session_start"]);

    // Nothing beyond the `on` registrations, the two commands, and the two
    // cycle shortcuts (no tools, flags, renderers, providers, no emit at
    // registration).
    const unexpected = calls.filter(
      (c) =>
        c.method !== "on" &&
        c.method !== "registerCommand" &&
        c.method !== "registerShortcut",
    );
    expect(unexpected).toHaveLength(0);
  });

  it("registers the two mode-cycle shortcuts with handlers", () => {
    const { pi, calls } = makePi();
    factory(pi);

    const shortcuts = calls.filter((c) => c.method === "registerShortcut");
    expect(shortcuts).toHaveLength(2);

    const keys = shortcuts.map((c) => c.args[0]).sort();
    expect(keys).toEqual([CYCLE_FORWARD_KEY, CYCLE_BACKWARD_KEY].sort());

    for (const sc of shortcuts) {
      const options = sc.args[1] as { handler: unknown };
      expect(typeof options.handler).toBe("function");
    }
  });
});
