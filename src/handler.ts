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
  NO_MODE_SIGNATURE,
} from "./cache.js";
import type { CacheKeyInputs } from "./cache.js";

export type RequiredBeforeAgentStartResult = BeforeAgentStartEventResult & {
  systemPrompt: string;
};

/**
 * `before_agent_start` handler — identity-injecting, cache-aware form.
 *
 * Per turn:
 *   1. Build cache-key inputs from `ctx.model` (empty id/provider when the
 *      model is undefined) + `NO_MODE_SIGNATURE` (no mode yet) +
 *      `e.systemPrompt` (pi's assembled base).
 *   2. `getCachedResult(key)` — advances the turn counter; returns the cached
 *      result on HIT, `undefined` on MISS.
 *   3. HIT  → return `{ systemPrompt: cached }` (identity was baked in at the
 *      prior miss; no re-assembly, no re-derive).
 *   4. MISS → derive identity from `ctx.model` (empty string when undefined),
 *      assemble `identity + "\n" + e.systemPrompt` when identity is non-empty
 *      (else `e.systemPrompt` unchanged — no leading newline),
 *      `setCachedResult(key, result, inputs)`, return.
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
  const modelId = model?.id ?? "";
  const modelProvider = model?.provider ?? "";

  const inputs: CacheKeyInputs = {
    modelId,
    modelProvider,
    modeSignature: NO_MODE_SIGNATURE,
    baseSystemPrompt: e.systemPrompt,
  };
  const key = computeCacheKey(inputs);

  // HIT — return the previously-assembled result unchanged.
  const cached = getCachedResult(key);
  if (cached !== undefined) {
    return { systemPrompt: cached };
  }

  // MISS — derive identity, assemble (identity leads), store, return.
  const identity = model ? deriveIdentityLine(model) : "";
  const result = identity ? `${identity}\n${e.systemPrompt}` : e.systemPrompt;
  setCachedResult(key, result, inputs);
  return { systemPrompt: result };
}
