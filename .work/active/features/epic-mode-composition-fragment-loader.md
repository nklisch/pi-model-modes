---
id: epic-mode-composition-fragment-loader
kind: feature
stage: drafting
tags: [tests]
parent: epic-mode-composition
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Fragment Loader — convention-directory discovery + stat-invalidated content cache

## Brief

This feature delivers `src/fragments.ts`: the module that discovers fragment
markdown files by directory convention and serves their trimmed content through
a module-scope cache. Axes (`axis/agency`, `axis/quality`, `axis/scope`) and
`modifiers/` are discovered by convention — dropping a `.md` in `axis/agency/`
makes it a selectable value with no code change — while `base/` keeps an ordered
`base.json` manifest because base slot order is load-bearing. Discovery yields
deterministic (filename-sorted) orderings so the downstream splice is
reproducible across turns.

The cache is **stat/mtime-based, not read-once**: it stores `{ mtime, content }`
per path and re-reads only when a file's mtime changes. This honors the epic's
locked decision that an edited fragment `.md` takes effect on the next turn
within the same session (no `/reload`/restart) while keeping I/O to a cheap stat
per access. Fragment root is resolved **package-relative** (never cwd-relative —
this is a pi package that runs in the user's working dir), with a test-only root
override so fixtures load deterministically.

This feature also ships the **minimal starter fragment set** (one file per type —
one base overlay, one fragment per axis, one modifier) sufficient to exercise the
engine and its tests. It does NOT author the ~40 real fragments (that is
`epic-fragment-library`), and it does NOT resolve modes or splice (those are
`mode-resolver` / `deterministic-splice`).

## Epic context

- Parent epic: `epic-mode-composition`
- Position in epic: **foundation — no deps; `mode-resolver` and the materialized
  ModePlan build on its content + ordering.** Parallelizes with `preset-table`.

## Foundation references

- `docs/SPEC.md` — "Mode composition" (fragment set + fixed splice order),
  "Cache stability" (deterministic ordering: no `Set` iteration / unordered keys).
- `docs/ARCHITECTURE.md` — "Fragment library" (`src/fragments.ts` reads each file
  once into a module-scope `Map`; base manifest vs convention discovery),
  "Components".

## Inherited / epic design decisions (do not re-litigate)

- **Hybrid discovery**: axes + modifiers by directory convention; `base/` via an
  ordered `base.json` manifest (slot order is load-bearing).
- **Stat/mtime invalidation** (resolved in the epic's codex advisory): the
  module cache keys content by path and re-reads on mtime change, so live edits
  apply next turn without `/reload` — the read-once promise is replaced by
  read-once-per-unchanged-mtime.
- **Package-relative fragment root** with a test override (not cwd-relative).
- **Deterministic ordering**: convention discovery returns filename-sorted
  results; the base manifest pins base order explicitly.
- **Validation fail-fast** (this feature's slice): a manifest entry pointing at a
  missing file, or an unreadable fragment dir, fails fast rather than silently
  yielding empty content.
