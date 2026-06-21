import type {
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
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
 * `before_agent_start` handler — identity-injecting, cache-aware form.
 *
 * Per turn:
 *   1. Resolve the active mode into a `ModePlan` (BEFORE the cache check —
 *      `plan.signature` is part of the key). When no mode is active the plan
 *      is `{ mode: undefined, signature: NO_MODE_SIGNATURE, fragments: [] }`.
 *   2. Build cache-key inputs from `ctx.model` (empty id/provider when the
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

  // Resolve the active mode BEFORE the cache check — its signature is part of
  // the key. Unset is the fast path: NO_MODE_SIGNATURE + empty fragments.
  const plan = resolveActiveModePlan();

  const inputs: CacheKeyInputs = {
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

  // MISS — derive identity, then a two-path splice, store, return.
  const identity = model ? deriveIdentityLine(model) : "";
  const result =
    plan.mode === undefined
      ? // Unset: legacy identity-only form (single `\n`) — preserves Invariant 3.
        identity
        ? `${identity}\n${e.systemPrompt}`
        : e.systemPrompt
      : // Mode active: identity + ordered fragments + base (blank-line join).
        assembleSystemPrompt(identity, plan, e.systemPrompt);
  setCachedResult(key, result, inputs);
  return { systemPrompt: result };
}
