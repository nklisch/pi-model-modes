# Defensive clone at the module boundary

Stateful modules clone mutable objects on both store and read so caller mutation cannot rewrite stored state and returned references cannot expose module-owned state.

## Rationale

Module-scope singletons own their values. Without cloning on input, later caller mutation silently changes effective state; without cloning on output, a consumer can corrupt the next read. Copy nested mutable arrays as well as the containing object.

## Examples

### Override tier clones on store and read

**Files**: `src/resolver.ts:213`, `src/resolver.ts:243`

```ts
const normalized = normalize(spec);
materializePlan(normalized);
activeSpec = typeof spec === "string" ? spec : normalized;

return { ...activeSpec, modifiers: [...activeSpec.modifiers] };
```

### Default tier mirrors the boundary

**Files**: `src/resolver.ts:260`, `src/resolver.ts:286`

`setDefaultMode` stores a normalized clone and `getDefaultMode` returns a fresh object with a fresh `modifiers` array.

### Cache snapshots do not expose the ring

**File**: `src/cache.ts:231`

```ts
export function getChangeSignal(): ChangeSignalSnapshot {
  return {
    currentTurn,
    currentKey: lastKey,
    entries: [...ring],
    lastEntry: ring[ring.length - 1],
  };
}
```

Cache writes likewise build a fresh components object before retaining it.

## When to use

- A stateful module stores a caller-supplied object or options bag.
- A getter would otherwise return a live reference to module-owned state.

## When not to use

- Immutable primitives or strings.
- Values already produced as fresh immutable snapshots by another boundary.

## Common violations

- Assigning a caller's object directly to module state.
- Returning an internal array or object directly.
- Shallow-cloning an object while leaving nested mutable arrays aliased.
