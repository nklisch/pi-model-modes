import { describe, it, expect, beforeEach } from "vitest";
import { handleBeforeAgentStart } from "../src/handler.js";
import { deriveIdentityLine } from "../src/identity.js";
import { resetCacheForTesting } from "../src/cache.js";
import { makeContext, makeEvent, makeModel } from "./harness.js";

describe("handleBeforeAgentStart — Invariant 1 (no mutation + no cached-output leak, identity-prepended)", () => {
  const model = makeModel({ name: "GLM-4.6", provider: "zai" });
  const identity = deriveIdentityLine(model);
  const assemble = (base: string) => `${identity}\n${base}`;

  beforeEach(() => resetCacheForTesting());

  it("does not mutate the input event (Object.freeze catches any mutation as a thrown TypeError)", () => {
    const e = makeEvent("line1\nline2\n<project_context>...</project_context>");
    Object.freeze(e);
    expect(() => handleBeforeAgentStart(e, makeContext({ model }))).not.toThrow();
    // Identity-prepended (no longer byte-identical to input); freeze proves no mutation.
    expect(handleBeforeAgentStart(e, makeContext({ model })).systemPrompt).toBe(
      assemble(e.systemPrompt),
    );
  });

  it("does not leak a previous output across calls (A→B→C→A sequence)", () => {
    const a1 = handleBeforeAgentStart(makeEvent("PROMPT_A"), makeContext({ model }));
    const b  = handleBeforeAgentStart(makeEvent("PROMPT_B"), makeContext({ model }));
    const c  = handleBeforeAgentStart(makeEvent("PROMPT_C"), makeContext({ model }));
    const a2 = handleBeforeAgentStart(makeEvent("PROMPT_A"), makeContext({ model }));

    // Each return reflects THAT call's input (identity + base), not a leaked
    // prior output. a2 is a MISS (lastKey was C), so it re-assembles from A.
    expect(a1.systemPrompt).toBe(assemble("PROMPT_A"));
    expect(b.systemPrompt).toBe(assemble("PROMPT_B"));
    expect(c.systemPrompt).toBe(assemble("PROMPT_C"));
    expect(a2.systemPrompt).toBe(assemble("PROMPT_A")); // NOT leaked from a1 or c
  });
});
