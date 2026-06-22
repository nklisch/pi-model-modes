# Temp-fixture test scaffold

Filesystem/state-touching tests use the same scaffold: a module-level `tmp`, a
`freshRoot()` or `freshDir()` helper that creates a temp dir and points test seams
at it, a `write(root, rel, content)` helper, an optional `buildFixture()`, and
`beforeEach`/`afterEach` that reset stateful modules and remove the temp tree.

## Rationale

Fragment/config tests need deterministic files, isolation from the user's real
home/project, and no state leakage across cases. Copying the same scaffold keeps
fixture completeness and teardown behavior consistent.

## Examples

### Fragment-loader preamble

**File**: `tests/fragments.test.ts:35`

```ts
let tmp: string | undefined;
function freshRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "frag-"));
  tmp = root;
  setFragmentRootForTesting(root);
  return root;
}
```

### Resolver fixture builder

**Files**: `tests/resolver.test.ts:45`, `tests/resolver.test.ts:65`

```ts
function buildFixture(): string {
  const root = freshRoot();
  write(root, "axis/agency/autonomous.md", "AGENCY-autonomous");
  write(root, "axis/quality/pragmatic.md", "QUALITY-pragmatic");
  write(root, "axis/scope/adjacent.md", "SCOPE-adjacent");
  write(root, "base.json", JSON.stringify({ overlays: ["base/chill.md"] }));
  return root;
}
```

### Full reset/cleanup pairing

**File**: `tests/handler-mode.test.ts:80`

```ts
beforeEach(() => {
  resetCacheForTesting();
  resetResolverForTesting();
  resetFragmentsForTesting();
  resetPresetsForTesting();
  buildFixture();
});

afterEach(() => {
  if (tmp) { rmSync(tmp, { recursive: true, force: true }); tmp = undefined; }
  resetFragmentsForTesting();
  resetResolverForTesting();
});
```

## When to use

- Tests that touch `prompts/`, config files, or module-scope state.
- Registered-handler tests that need a deterministic fragment tree.

## When not to use

- Pure-module tests that pass plain values or synthetic JSON.
- Single assertions with no filesystem/state seam.

## Common violations

- Forgetting to reset one of the imported stateful modules.
- Leaving temp dirs behind.
- Building a fixture that omits fragments a bundled preset may cycle onto.
