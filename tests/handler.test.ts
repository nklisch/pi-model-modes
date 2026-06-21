import { describe, it, expect, beforeEach } from "vitest";
import { handleBeforeAgentStart } from "../src/handler.js";
import { deriveIdentityLine } from "../src/identity.js";
import { resetCacheForTesting } from "../src/cache.js";
import { makeContext, makeEvent, makeModel } from "./harness.js";

describe("handleBeforeAgentStart — cache-path coverage (always-return on HIT and MISS)", () => {
  const model = makeModel({ name: "GLM-4.6", provider: "zai" });

  beforeEach(() => resetCacheForTesting());

  it("first call (MISS) returns a present string", () => {
    const r = handleBeforeAgentStart(makeEvent("base prompt"), makeContext({ model }));
    expect(typeof r.systemPrompt).toBe("string");
    expect(r.systemPrompt.length).toBeGreaterThan(0);
  });

  it("second identical call (HIT) returns the cached present string", () => {
    const r1 = handleBeforeAgentStart(makeEvent("base prompt"), makeContext({ model }));
    const r2 = handleBeforeAgentStart(makeEvent("base prompt"), makeContext({ model }));
    expect(typeof r2.systemPrompt).toBe("string");
    expect(r2.systemPrompt).toBe(r1.systemPrompt); // HIT returns prior miss's bytes
  });

  it("changed input (MISS) still returns a present string", () => {
    handleBeforeAgentStart(makeEvent("base prompt A"), makeContext({ model }));
    handleBeforeAgentStart(makeEvent("base prompt B"), makeContext({ model })); // base change → MISS
    const r = handleBeforeAgentStart(makeEvent("base prompt A"), makeContext({ model })); // back to A → MISS
    expect(typeof r.systemPrompt).toBe("string");
    expect(r.systemPrompt.length).toBeGreaterThan(0);
  });

  it("switching model re-derives identity on the next MISS (per-turn live derivation)", () => {
    const modelA = makeModel({ name: "GLM-4.6", provider: "zai" });
    const modelB = makeModel({ name: "Claude Sonnet 4", provider: "anthropic" });
    const rA = handleBeforeAgentStart(makeEvent("base"), makeContext({ model: modelA }));
    const rB = handleBeforeAgentStart(makeEvent("base"), makeContext({ model: modelB }));
    expect(rA.systemPrompt.split("\n")[0]).toBe(deriveIdentityLine(modelA));
    expect(rB.systemPrompt.split("\n")[0]).toBe(deriveIdentityLine(modelB));
  });
});
