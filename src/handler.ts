import type {
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

/**
 * Strict return type — narrows pi's optional `systemPrompt?: string` field to
 * a required `string`. This makes the always-return guarantee a COMPILE-TIME
 * invariant: a handler that returns `{}`, `undefined`, or omits the field is
 * a type error, not just a test failure. Defense-in-depth: `tests/noop.test.ts`
 * also asserts the return is a present string across fixtures.
 */
export type RequiredBeforeAgentStartResult = BeforeAgentStartEventResult & {
  systemPrompt: string;
};

/**
 * `before_agent_start` handler. SCAFFOLDING / NO-OP FORM.
 *
 * CONTRACT (established here, inherited by every downstream epic):
 *  - ALWAYS returns `{ systemPrompt: e.systemPrompt }` — never `undefined`.
 *    pi reads `undefined` (or a missing field) as "revert to base" and would
 *    drop any later identity/mode injection, so the always-return discipline
 *    is baked in here. The strict `RequiredBeforeAgentStartResult` return
 *    type enforces this at compile time; `tests/noop.test.ts` enforces it at
 *    runtime as defense-in-depth.
 *  - Never mutates `e.systemPrompt` (or any field of `e`).
 *  - Never sources from a cached "previous output." There is no module-level
 *    mutable state on the return path at this stage; the shape is deliberately
 *    free of any `let lastResult` so later epics inherit the clean-base
 *    discipline by construction.
 *
 * No mode/identity/fragment/cache logic yet — this epic is the no-op. The
 * `_ctx` param is unused at this stage (underscore-prefixed to satisfy
 * `noUnusedParameters`); downstream epics rename it to `ctx` when they start
 * reading `ctx.model` / `ctx.getSystemPrompt()`.
 *
 * Note on pi's application semantics: `agent-session.js` applies the result
 * with `if (result?.systemPrompt)`, so an empty-string `systemPrompt` would
 * ALSO reset to base at the final application point. Real pi prompts are
 * never empty, so this is irrelevant in production — our handler simply
 * returns its input unchanged.
 */
export function handleBeforeAgentStart(
  e: BeforeAgentStartEvent,
  _ctx: ExtensionContext,
): RequiredBeforeAgentStartResult {
  return { systemPrompt: e.systemPrompt };
}
