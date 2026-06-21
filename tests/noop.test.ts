import { describe, it, expect } from "vitest";
import { handleBeforeAgentStart } from "../src/handler.js";
import { makeContext, makeEvent } from "./harness.js";

/**
 * Invariant 3 (SPEC: no-op-unset) — the handler returns pi's assembled system
 * prompt byte-identical, and the return is always a present string (never
 * undefined). Defense-in-depth for the compile-time `RequiredBeforeAgentStartResult`
 * return type on the handler.
 */
describe("handleBeforeAgentStart — Invariant 3 (no-op-unset: byte-identical + never-undefined)", () => {
  const fixtures: Record<string, string> = {
    empty: "",
    whitespace: "   \n\t  ",
    typical:
      "You are an expert coding assistant operating inside pi...\n\nAvailable tools:\n- read: Read file contents\n- bash: Execute bash commands",
    "project-context":
      "You are an expert...\n\n<project_context>\n\n<project_instructions path=\"AGENTS.md\">\nProject rules here\n</project_instructions>\n\n</project_context>",
  };

  for (const [name, input] of Object.entries(fixtures)) {
    it(`returns systemPrompt byte-identical and defined (${name})`, () => {
      const result = handleBeforeAgentStart(makeEvent(input), makeContext());
      // Never undefined — catches an accidental omitted return.
      expect(typeof result.systemPrompt).toBe("string");
      // Byte-identical to the input.
      expect(result.systemPrompt).toBe(input);
      // Only the systemPrompt field is returned (no message custom payload
      // at this stage).
      expect(result.message).toBeUndefined();
    });
  }
});
