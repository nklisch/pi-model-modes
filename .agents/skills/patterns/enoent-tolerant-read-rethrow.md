# ENOENT-tolerant read with explicit rethrow

Reads that legitimately expect a missing file catch filesystem errors, treat
`ENOENT` as the documented missing case, and rethrow or surface every other
error so real I/O failures are not mislabeled as absence.

## Rationale

Fresh installs often lack plugin config files, while convention directories may
be absent or malformed in ways that need clear messages. Missing is normal;
permission errors and other I/O failures are not.

## Examples

### Tolerant config read

**File**: `src/config.ts:55`

```ts
try {
  text = readFileSync(path, "utf8");
} catch (cause) {
  if ((cause as NodeJS.ErrnoException).code === "ENOENT") return {};
  console.warn(`pi-model-modes: could not read config "${path}": ${(cause as Error).message}`);
  return {};
}
```

### Axis discovery

**File**: `src/fragments.ts:53`

```ts
try {
  files = listMarkdown(dir);
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === "ENOENT") {
    throw new Error(`Fragment axis dir not found: ${dir}`);
  }
  throw err;
}
```

### Base overlay stat

**File**: `src/fragments.ts:124`

```ts
try {
  st = statSync(abs);
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === "ENOENT") {
    throw new Error(`base.json references missing overlay: ${abs} (entry "${entry}")`);
  }
  throw err;
}
```

## When to use

- Config files/directories users may not have created yet.
- Convention-tree discovery where absence is a named condition.

## When not to use

- Required bundled assets such as `presets.json`.
- Strict write paths where malformed content must block overwrite.

## Common violations

- `catch { return {}; }` for all errors.
- Throwing a generic not-found message without checking `ENOENT`.
- Losing the original error for permission/I/O failures.
