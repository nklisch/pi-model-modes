# Stateful module + `resetXForTesting` seam

Stateful modules keep mutable state at module scope and expose a single TEST-only
`resetXForTesting()` that returns the module to load-time defaults. Tests call it
in `beforeEach` / `afterEach` so Vitest's shared process never leaks state across
cases.

## Rationale

The cache, resolver tiers, fragment cache, preset memo, config path overrides,
footer flag, and handler memo are stateful by design. Module-scope state keeps
production call sites simple; explicit resets make the mutable state complete and
auditable.

## Examples

### Cache state + reset

**Files**: `src/cache.ts:92`, `src/cache.ts:238`

```ts
let lastKey: string | undefined;
let lastResult: string | undefined;
let lastComponents: KeyComponents | undefined;
let currentTurn = 0;
const ring: ChangeSignalEntry[] = [];

export function resetCacheForTesting(): void {
  lastKey = undefined;
  lastResult = undefined;
  lastComponents = undefined;
  currentTurn = 0;
  ring.length = 0;
}
```

### Resolver tiers + reset

**Files**: `src/resolver.ts:86`, `src/resolver.ts:329`

```ts
let activeSpec: ModeSpec | undefined;
let defaultSpec: ModeSpec | undefined;

export function resetResolverForTesting(): void {
  activeSpec = undefined;
  defaultSpec = undefined;
}
```

### Path override + reset

**Files**: `src/config.ts:54`, `src/config.ts:649`, `src/config.ts:658`

```ts
let globalPathOverride: string | undefined;
let projectPathOverride: string | undefined;

export function setConfigPathsForTesting(paths: { global?: string; project?: string }): void { /* set */ }
export function resetConfigForTesting(): void { /* clear */ }
```

## When to use

- Any module holding process-local state across calls.
- Modules that need test-only filesystem roots or config paths.

## When not to use

- Pure modules such as `identity.ts`, `assemble.ts`, and `provider-names.ts`.
- State that should belong to a caller-owned object lifetime.

## Common violations

- Adding a new module-scope `let` without updating the reset.
- Resetting only part of the module state.
- Forgetting the reset in test setup/teardown.
