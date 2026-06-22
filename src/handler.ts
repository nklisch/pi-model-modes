import type {
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { Model } from "@earendil-works/pi-ai";
import { deriveIdentityLine } from "./identity.js";
import {
  computeCacheKey,
  getCachedResult,
  setCachedResult,
} from "./cache.js";
import type { CacheKeyInputs } from "./cache.js";
import { resolveActiveModePlan } from "./resolver.js";
import { assembleSystemPrompt } from "./assemble.js";

export type RequiredBeforeAgentStartResult = BeforeAgentStartEventResult & {
  systemPrompt: string;
};

/**
 * The most recent pi-assembled BASE system prompt seen by this handler (i.e.
 * `e.systemPrompt`, BEFORE this plugin splices anything in). Set on every
 * `before_agent_start` invocation; `undefined` until the first turn has run.
 *
 * Read by `/mode:inspect --prompt` so the debug view can re-run the splice
 * against the same base the live turn used. We CANNOT read
 * `ctx.getSystemPrompt()` for this — that returns the ALREADY-SPLICED prompt
 * (`session.systemPrompt` set to `result.systemPrompt` after our handler ran),
 * so re-assembling on top of it would double-splice identity + fragments.
 */
let lastBaseSystemPrompt: string | undefined;

/** Read the most recent pi base prompt; `undefined` until the first turn. */
export function getLastBaseSystemPrompt(): string | undefined {
  return lastBaseSystemPrompt;
}

/** TEST-ONLY: clear the base-prompt memo so the next read returns `undefined`. */
export function resetHandlerForTesting(): void {
  lastBaseSystemPrompt = undefined;
}

/**
 * PURE: assemble the same bytes `handleBeforeAgentStart` would produce for the
 * given model + base prompt, using the CURRENTLY active mode (resolved fresh
 * via `resolveActiveModePlan()`). SINGLE source of truth for the splice — the
 * live handler below calls this too, so `/mode:inspect --prompt` and the live
 * turn cannot drift apart.
 *
 * Two-path splice mirrors the handler exactly:
 *   - mode unset  → identity-only single-`\n` join (or bare base when no model)
 *   - mode active → `assembleSystemPrompt(identity, plan, base)` (blank-line join)
 */
export function assembleForInspect(
  model: Model<any> | undefined,
  baseSystemPrompt: string,
): string {
  const plan = resolveActiveModePlan();
  const identity = model ? deriveIdentityLine(model) : "";
  return spliceSystemPrompt(identity, plan, baseSystemPrompt);
}

/**
 * PURE two-path splice. Extracted so both `handleBeforeAgentStart` (live turn)
 * and `assembleForInspect` (debug view) run identical bytes for identical inputs.
 */
function spliceSystemPrompt(
  identity: string,
  plan: ReturnType<typeof resolveActiveModePlan>,
  baseSystemPrompt: string,
): string {
  return plan.mode === undefined
    ? // Unset: legacy identity-only form (single `\n`) — preserves the
      // no-op-when-unset invariant byte-for-byte.
      identity
        ? `${identity}\n${baseSystemPrompt}`
        : baseSystemPrompt
    : // Mode active: identity + ordered fragments + base (blank-line join).
      assembleSystemPrompt(identity, plan, baseSystemPrompt);
}

/**
 * `before_agent_start` handler — identity-injecting, cache-aware form.
 *
 * Per turn:
 *   1. Resolve the active mode into a `ModePlan` (BEFORE the cache check —
 *      `plan.signature` is part of the key). When no mode is active the plan
 *      is `{ mode: undefined, signature: NO_MODE_SIGNATURE, fragments: [] }`.
 *   2. Build cache-key inputs from `ctx.model` (empty name/id/provider when the
 *      model is undefined) + `plan.signature` (NO_MODE_SIGNATURE when unset) +
 *      `e.systemPrompt` (pi's assembled base).
 *   3. `getCachedResult(key)` — advances the turn counter; returns the cached
 *      result on HIT, `undefined` on MISS.
 *   4. HIT  → return `{ systemPrompt: cached }` (identity + any mode fragments
 *      were baked in at the prior miss; no re-assembly, no re-derive).
 *   5. MISS — derive identity from `ctx.model` (empty string when undefined),
 *      then a TWO-PATH splice:
 *        - unset (`plan.mode === undefined`): keep the legacy identity-only
 *          form — `identity + "\n" + e.systemPrompt` when identity is non-empty
 *          (else `e.systemPrompt` unchanged, no leading newline). Single `\n`
 *          join preserves Invariant 3 (no-op when unset) byte-for-byte.
 *        - mode active: `assembleSystemPrompt(identity, plan, e.systemPrompt)`
 *          (identity + ordered fragments + base, blank-line join).
 *      Then `setCachedResult(key, result, inputs)`, return.
 *
 * Contracts preserved from `epic-scaffold-handler`:
 *   - ALWAYS returns `{ systemPrompt: <string> }`, never `undefined`, on BOTH
 *     paths (strict `RequiredBeforeAgentStartResult` makes omission a
 *     compile-time error).
 *   - Never mutates `e.systemPrompt` or any field of `e`.
 *   - Clean-base: the MISS splice sources from `e.systemPrompt`, never from
 *     `lastResult`. The HIT path returns `lastResult` wholesale without
 *     splicing into it — so identity is never stacked across turns.
 */
export function handleBeforeAgentStart(
  e: BeforeAgentStartEvent,
  ctx: ExtensionContext,
): RequiredBeforeAgentStartResult {
  const model = ctx.model; // Model<any> | undefined

  // Memo the unspliced base for /mode:inspect --prompt. See
  // lastBaseSystemPrompt's doc comment for why ctx.getSystemPrompt() is not
  // usable as the base.
  lastBaseSystemPrompt = e.systemPrompt;

  // Resolve the active mode BEFORE the cache check — its signature is part of
  // the key. Unset is the fast path: NO_MODE_SIGNATURE + empty fragments.
  const plan = resolveActiveModePlan();

  const inputs: CacheKeyInputs = {
    modelName: model?.name ?? "",
    modelId: model?.id ?? "",
    modelProvider: model?.provider ?? "",
    modeSignature: plan.signature, // NO_MODE_SIGNATURE when unset
    baseSystemPrompt: e.systemPrompt,
  };
  const key = computeCacheKey(inputs);

  // HIT — return the previously-assembled result unchanged.
  const cached = getCachedResult(key);
  if (cached !== undefined) {
    return { systemPrompt: cached };
  }

  // MISS — derive identity, splice via the shared pure helper, store, return.
  const identity = model ? deriveIdentityLine(model) : "";
  const result = spliceSystemPrompt(identity, plan, e.systemPrompt);
  setCachedResult(key, result, inputs);
  return { systemPrompt: result };
}
