# Content-derived cache signatures

Hash resolved prompt content and propagate those signatures into cache identity so edits to file-backed fragments invalidate cached output even when names and paths stay unchanged.

## Rationale

Mode and style names are selectors, not complete cache identities. Their backing Markdown can change within a running session. Content-derived signatures make the cache sensitive to the bytes that actually enter the prompt while preserving stable keys when a file is merely touched without changing content.

## Examples

### Canonical outer cache key

**File**: `src/cache.ts:100`

```ts
export function computeCacheKey(inputs: CacheKeyInputs): string {
  return sha256(encodeComponents(componentsOf(inputs)));
}
```

### Mode fragments contribute content hashes

**File**: `src/resolver.ts:175`

```ts
fragments.push({ slot: axis, value, path, content });
sigEntries.push({ slot: axis, value, hash: sha256(content) });
```

### Style content contributes its own signature

**File**: `src/style.ts:215`

```ts
signature: content === "" ? NO_STYLE_SIGNATURE : sha256(content),
```

### Handler propagates every content identity

**File**: `src/handler.ts:101`

```ts
const inputs: CacheKeyInputs = {
  modeSignature: plan.signature,
  styleSignature: stylePlan.signature,
  baseSystemPrompt: e.systemPrompt,
  // model identity fields omitted here
};
```

## When to use

- Cached output depends on mutable file-backed prompt content.
- A selector name may stay stable while its resolved bytes change.
- Touching a file without changing content should keep the cache key stable.

## When not to use

- The value is immutable and already represented completely by its identifier.
- The content is UI-only and never contributes to cached behavior.
- A cryptographic security guarantee is required; these hashes are cache identity, not authentication.

## Common violations

- Keying only by fragment name or path.
- Omitting one prompt layer from the outer cache key.
- Hashing stale pre-resolution content.
- Giving unset/explicit-empty sentinels a nondeterministic signature.
