# Validate before committing state

Fully validate or materialize candidate state before assigning module state or reconciling durable configuration, so failed updates preserve the last valid state.

## Rationale

Selections can fail because a name is unknown, a fragment vanished, a path escapes its scope, or a config target is malformed. Assigning first creates partial state and forces rollback logic. Validating first makes failure atomic: either the candidate is proven usable and committed, or nothing changes.

## Examples

### Session mode override

**File**: `src/resolver.ts:227`

```ts
const normalized = normalize(spec);
materializePlan(normalized); // throws before assignment
activeSpec = typeof spec === "string" ? spec : normalized;
```

### Durable mode default

**File**: `src/resolver.ts:272`

```ts
const normalized = normalize(spec);
materializePlan(normalized);
defaultSpec = typeof spec === "string" ? spec : normalized;
```

### Style defaults and registry

**File**: `src/style.ts:143`

```ts
const nextRegistry = cloneRegistry(state.registry);
if (state.selection !== undefined) {
  resolveSelection(state.selection, nextRegistry);
}
defaultSelection = state.selection;
registry = nextRegistry;
```

### Style session override

**File**: `src/style.ts:157`

```ts
resolveSelection(name, registry);
activeSelection = name;
```

### Durable config reconciliation

**File**: `src/config.ts:439`

```ts
loaded = readObjectForWrite(path); // strict boundary validation
// write/rename succeeds before applyDefaultFromConfig/applyStyleFromConfig
```

## When to use

- Updating process-local mode/style/config selections.
- Replacing a mutable registry that a selection depends on.
- Writing durable state that is reconciled into memory afterward.
- Any update where the prior valid value must survive a rejected candidate.

## When not to use

- Clearing state is intentionally unconditional.
- The operation is observational and commits nothing.
- The caller owns a transactional object that already provides atomic commit/rollback.

## Common violations

- Assigning before materialization and attempting ad hoc rollback.
- Mutating the live registry while validating entries.
- Reseeding resolver state before the filesystem write succeeds.
- Catching an error after partial mutation and pretending the old state survived.
