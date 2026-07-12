# Resolver-throw graceful degrade

Every UI/read site that calls `resolveActiveModePlan()` catches resolver throws,
records `modeError`, and renders an "unresolvable" fallback instead of crashing
the surface.

## Rationale

Mode validation happens at set-time, but fragment files can change later. The
resolver must still fail fast at resolve-time, while user-facing diagnostics and
status surfaces should explain the broken state rather than turn an expected
integrity failure into an opaque command error.

## Examples

### Footer refresh

**File**: `src/footer.ts:178`

```ts
let mode: ResolvedMode | undefined;
let modeError: string | undefined;
try {
  mode = resolveActiveModePlan().mode;
} catch (err) {
  modeError = (err as Error).message;
}
```

### `/mode` listing

**File**: `src/commands.ts:422`

```ts
try {
  mode = resolveActiveModePlan().mode;
} catch (err) {
  modeError = (err as Error).message;
}
```

### `/mode:inspect --prompt`

**Files**: `src/commands.ts:564`, `src/commands.ts:601`

```ts
if (modeError !== undefined) {
  assembledPrompt = `(could not assemble — ${modeError})`;
}
```

The cycle keybinding toast follows the same discipline around base-glyph lookup
at `src/keybinding.ts:94`.

## When to use

- Any UI surface that displays effective mode or derived mode details.
- Diagnostic paths where the resolver error is itself useful output.

## When not to use

- `setActiveMode` / `setDefaultMode`, which deliberately reject bad specs before
  storing them.

## Common violations

- Calling `resolveActiveModePlan().mode` in a registered handler without catch.
- Swallowing the error and rendering `unset` instead of `unresolvable`.
- Hardening the bare panel but forgetting the prompt/assembled branch.
