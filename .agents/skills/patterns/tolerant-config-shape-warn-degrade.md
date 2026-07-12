# Tolerant config shape validation with warning and degradation

Validate every value from user-owned config independently. A malformed key or entry warns with the plugin prefix and degrades only that value to its safe default instead of throwing, so session seeding stays usable and valid siblings survive.

## Rationale

This applies after JSON parsing, where unknown value shapes still cross a trust boundary. It is distinct from tolerant file reads and from UI-level resolver degradation: configuration bootstrap must never crash the session because one user-edited field has the wrong type.

## Examples

### Non-object config degrades to empty

**File**: `src/config.ts:78`

```ts
if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
  console.warn(`pi-model-modes: config "${path}" is not a JSON object — ignoring`);
  return {};
}
```

### Invalid record entries are skipped independently

**File**: `src/config.ts:138`

```ts
for (const [name, value] of Object.entries(raw.customStyles)) {
  if (!isValidStyleName(name)) {
    console.warn(`pi-model-modes: invalid custom style name "${name}" in "${path}" — ignoring`);
  } else if (typeof value !== "string") {
    console.warn(`pi-model-modes: custom style "${name}" in "${path}" must map to a string path — ignoring`);
  } else {
    customStyles[name] = value;
  }
}
```

### Invalid downstream state clears safely

**File**: `src/config.ts:213`

```ts
try {
  setDefaultMode(config.defaultMode);
} catch (cause) {
  console.warn(`pi-model-modes: invalid config defaultMode "${config.defaultMode}" — skipping (${(cause as Error).message})`);
  clearDefaultMode();
}
```

The same shape appears in cycle-keybinding validation and writing-style seeding.

## When to use

- User-owned config feeding `session_start` or factory bootstrap.
- Heterogeneous records where malformed entries must not poison siblings.

## When not to use

- Strict write paths, which must refuse to overwrite malformed files.
- Required bundled assets such as `presets.json`, which should fail fast.

## Common violations

- Swallowing the whole file with `catch { return {}; }` and no warning.
- Throwing from a session config applier.
- Rejecting all entries because one record member is invalid.
- Retaining stale effective state after an invalid replacement value.
