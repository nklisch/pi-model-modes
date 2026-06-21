import { describe, it, expect } from "vitest";
import { handleBeforeAgentStart } from "../src/handler.js";
import { makeContext, makeEvent } from "./harness.js";

/**
 * Invariant 1 (SPEC: clean-base handling) — SCAFFOLDING FORM.
 *
 * The handler treats `e.systemPrompt` as pristine on every call: never mutates
 * it, never sources from a cached "previous output." This test seeds that
 * discipline on the no-op handler before splicing exists.
 *
 * The FULL FORM of Invariant 1 — "across N consecutive turns with a mode set,
 * the assembled prompt contains exactly one identity line and exactly one copy
 * of each selected fragment" — lands in `epic-mode-composition`, per that
 * epic's recorded clean-base test upgrade handoff (commit fc16294).
 */
describe("handleBeforeAgentStart — Invariant 1 SCAFFOLDING (no mutation + no cached previous output)", () => {
  it("does not mutate the input event (Object.freeze catches any mutation as a thrown TypeError)", () => {
    const e = makeEvent(
      "line1\nline2\n<project_context>\n<project_instructions path=\"AGENTS.md\">\nrules\n</project_instructions>\n</project_context>",
    );
    Object.freeze(e);
    // If the handler mutates `e` (reassigns systemPrompt, adds a field, etc.),
    // the frozen object throws a TypeError. Object.freeze is stronger than a
    // JSON snapshot — it catches sibling-field mutation too, at the moment of
    // attempted mutation.
    expect(() => handleBeforeAgentStart(e, makeContext())).not.toThrow();
    expect(handleBeforeAgentStart(e, makeContext()).systemPrompt).toBe(
      e.systemPrompt,
    );
  });

  it("does not leak a previous output across calls (A→B→C→A sequence)", () => {
    // A→B→C→A catches more module-state bugs than a simple A→B: it catches
    // "always returns first call's input", "returns last call's input",
    // "returns Nth call's input", and similar cache-leak failure modes. Each
    // return must equal THAT call's input.
    const a1 = handleBeforeAgentStart(makeEvent("PROMPT_A"), makeContext());
    const b = handleBeforeAgentStart(makeEvent("PROMPT_B"), makeContext());
    const c = handleBeforeAgentStart(makeEvent("PROMPT_C"), makeContext());
    const a2 = handleBeforeAgentStart(makeEvent("PROMPT_A"), makeContext());

    expect(a1.systemPrompt).toBe("PROMPT_A");
    expect(b.systemPrompt).toBe("PROMPT_B");
    expect(c.systemPrompt).toBe("PROMPT_C");
    expect(a2.systemPrompt).toBe("PROMPT_A"); // NOT leaked from a1 or c
  });
});
