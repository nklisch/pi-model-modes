import { describe, it, expect } from "vitest";
import factory from "../extensions/index.js";
import { handleBeforeAgentStart } from "../src/handler.js";
import { makePi } from "./harness.js";

/**
 * Registration wiring — the factory registers the `before_agent_start` handler
 * exactly once, by reference (the same function object the unit tests import),
 * and registers nothing else. Proves the "single registration surface" +
 * "unit-testability" property from ARCHITECTURE.md.
 */
describe("factory registration wiring", () => {
  it("registers before_agent_start by reference exactly once and nothing else", () => {
    const { pi, calls } = makePi();
    factory(pi);

    const registrations = calls.filter((c) => c.method === "on");
    expect(registrations).toHaveLength(1);

    const [call] = registrations;
    expect(call.args[0]).toBe("before_agent_start");
    // Registered by reference: the registered handler IS the same function
    // object the unit tests import (not an inline arrow).
    expect(call.args[1]).toBe(handleBeforeAgentStart);

    // Nothing else registered (no tools, commands, shortcuts, flags,
    // renderers, providers).
    expect(calls.filter((c) => c.method !== "on")).toHaveLength(0);
  });
});
