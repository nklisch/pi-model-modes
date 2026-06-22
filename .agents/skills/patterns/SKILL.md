---
name: patterns
description: "Project code patterns and conventions. Auto-loads when implementing, designing, verifying, or reviewing code. Provides detailed pattern definitions with code examples."
user-invocable: false
allowed-tools: Read, Glob, Grep
---

# Project Patterns Reference

This skill contains detailed pattern documentation for this project.
See individual pattern files for full rationale, examples, and common violations.

Available patterns:
- [pure-core-thin-pi-seam.md](pure-core-thin-pi-seam.md) — Every pi-facing surface is a PURE, pi-free function (fully unit-tested) plus a tiny `registerX(pi)` wrapper that is the only code allowed to touch `ExtensionAPI`/`ExtensionContext`.
- [stateful-module-reset-for-testing.md](stateful-module-reset-for-testing.md) — Stateful modules hold mutable state at module scope and expose one `resetXForTesting()` (plus optional `setXForTesting` path overrides) called by tests in `beforeEach`/`afterEach`; the reset is the contract that the listed state is complete.
- [resolver-throw-graceful-degrade.md](resolver-throw-graceful-degrade.md) — Wrap every `resolveActiveModePlan()` read in `try/catch` → `modeError`, and render a state-specific unresolvable fallback; the resolver stays Fail Fast, each surface degrades on its own terms.
- [enoent-tolerant-read-rethrow.md](enoent-tolerant-read-rethrow.md) — Wrap fs reads that may legitimately miss; narrow `(err).code === "ENOENT"` to a documented default, rethrow everything else so non-absence failures surface truthfully.
- [temp-fixture-test-scaffold.md](temp-fixture-test-scaffold.md) — Filesystem/state-touching tests share one preamble — `let tmp` + `freshRoot()`/`freshDir()` (calls `setXForTesting`) + `write(root, rel, content)` + `buildFixture()` + `beforeEach`/`afterEach` resets and `rmSync(tmp)`; pair with `tests/harness.ts` builders for the pi side.
