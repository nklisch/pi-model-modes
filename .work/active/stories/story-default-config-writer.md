---
id: story-default-config-writer
kind: story
stage: done
tags: [tests]
parent: feature-mode-default-management
depends_on: []
release_binding: v0.2.0
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Default-mode writer + scope reader (config.ts)

## Source

Parent design `feature-mode-default-management.md`, "Write pipeline" +
"Source-of-truth contract" (locked post Codex+Opus cross-review).

## Deliverable

Two new exports in `src/config.ts`:

### `writeDefaultToConfig(cwd, value, scope)`

```ts
type DefaultScope = "project" | "global";
type DefaultValue = string | "off" | "none";

function writeDefaultToConfig(
  cwd: string,
  value: DefaultValue,
  scope: DefaultScope,
): { ok: true; effectiveDefault: string | undefined; source: "global" | "project" | "unset" }
 | { ok: false; error: string; path: string };
```

Pipeline (validate → write → reconcile, NO early mutation):

1. Resolve `path = scope === "global" ? globalConfigPath() : projectConfigPath(cwd)`
   via the EXISTING seams (so `setConfigPathsForTesting` intercepts writes —
   Opus medium).
2. **Strict read-for-write.** Try `JSON.parse(readFileSync(path, "utf8"))`.
   Missing file (`ENOENT`) → `{}`. Anything else (parse error, non-object,
   array) → return `{ ok: false, error, path }` WITHOUT writing. (Codex high.)
3. **Mutate in memory.** `value === "off"` → `delete loaded.defaultMode`;
   else `loaded = { ...loaded, defaultMode: value }`. Sibling keys
   (`cycleKeybinding`, unknown future keys) preserved. (`none` is a valid
   `defaultMode` value — Codex high; resolver already accepts it.)
4. **Serialize** as `JSON.stringify(loaded, null, 2) + "\n"`. (Opus medium.)
5. **Atomic write.** `writeFileSync(tmpPath, text)` where `tmpPath = path + ".tmp"`,
   then `renameSync(tmpPath, path)`. (Both reviewers.)
6. **Bootstrap parent.** Before step 5, `mkdirSync(dirname(path), { recursive: true })`
   for BOTH scopes (global may be absent on a fresh machine). (Codex med.)
7. **Reconcile via the live merge.** Call `applyDefaultFromConfig(cwd)` —
   NOT `applySessionStart` (which would clear the override) and NOT
   `setDefaultMode` directly (which would skip the global/project merge).
   (Opus blocker.)
8. **Return the new effective default + source** so the caller can build a
   truthful notify without re-reading.
9. **Write-failure contract.** Any fs error in steps 5-6 → return
   `{ ok: false, error, path }`; resolver and footer untouched. (Codex med.)

### `readDefaultSources(cwd)`

```ts
function readDefaultSources(cwd: string): {
  global: string | undefined;
  project: string | undefined;
  effective: { value: string | undefined; source: "global" | "project" | "unset" };
};
```

For the bare `/mode default` panel. Reuses the strict loader (the panel can
tolerate malformed files by surfacing `(unreadable)` rather than crashing,
but the underlying value comes from `loadPluginConfig(cwd)`'s tolerant merge —
so `effective` is the merge result the resolver actually sees).

## Test matrix (tests/config.test.ts)

- Set + read round-trip in both scopes.
- `off` deletes the key; sibling keys (`cycleKeybinding`) survive BOTH set
  AND off round-trips.
- Malformed JSON in target file → `{ ok: false }`, file byte-unchanged,
  resolver default tier unchanged.
- `none` accepted, persisted, and reseed via `applyDefaultFromConfig` lands
  `getDefaultMode()` at `"none"`.
- Parent dir bootstrap: delete `<tmp>/.pi/`, write project, confirm dir + file created.
- Atomicity: confirm no `.tmp` left behind after a successful write.
- Write failure (mock `renameSync` to throw) → `{ ok: false }`, resolver untouched.
- Project `off` while global has a default → effective falls back to global
  (the Opus blocker case).
- 2-space indent + trailing newline in written file.

## Acceptance

- All test-matrix cases pass.
- `setConfigPathsForTesting` intercepts writes (writes hit the test paths).
- `npm run typecheck` clean; `npm test` green.

## Review (2026-06-21)

Verdict: Approve — story verified by implementation tests and final Codex
focused re-review.

Verification:

- `npm run typecheck` clean
- `npm test` 360/360 passing
- Codex focused re-review: PASS; prior clear-when-empty blocker fixed, no new blockers.

Accepted review finding fixed before approval:

- Codex final review found that clearing an unset/missing target wrote `{}` and
  created config dirs/files. Fixed in `writeDefaultToConfig`: clear-when-empty
  now returns `noop` before mkdir/write/reseed; tests cover missing target,
  sibling-only target, byte stability, no resolver reseed, no footer refresh.
