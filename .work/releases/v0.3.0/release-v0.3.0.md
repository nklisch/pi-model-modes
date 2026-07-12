---
id: release-v0.3.0
kind: release
stage: released
tags: []
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Release v0.3.0

## Bound items

- `feature-configurable-writing-styles` (feature, late-bound archived stub; completed atop `v0.2.0`)

## Gate runs

- **gate-security** (2026-07-12) — 0 findings (Critical=0, High=0, Medium=0, Low=0)

- **gate-tests** (2026-07-12) — 8 coverage gaps (Critical=0, High=1, Medium=3, Low=4; tautological=0)

- **gate-cruft** (2026-07-12) — 2 findings (High=0, Medium=1, Low=1)

- **gate-docs** (2026-07-12) — 2 findings (pattern-skill-staleness=1, foundation-doc-assertion=1)

- **gate-patterns** (2026-07-12) — 2 patterns extracted; 1 inconsistency tracked

All configured gates ran and every bound gate finding reached `stage: done`.

## Release

- **Date shipped:** 2026-07-12
- **Mapping:** tag-based
- **Version:** v0.3.0
- **Items shipped:** 15
- **Gate findings:** security 0; tests 8; cruft 2; docs 2; patterns 2 extracted + 1 inconsistency
- **Publishing:** annotated git tag `v0.3.0` pushed with `main` to `origin`
- **Verification:** 25 test files / 415 tests passed; TypeScript typecheck passed

## Shipped items

Bodies live in git history. Recover a pruned body with `git show <git ref>:<former path>`.

| id | title | kind | archived_atop | git ref |
|----|-------|------|---------------|---------|
| `feature-configurable-writing-styles` | Configurable writing styles | feature | v0.2.0 | a7e39de |
| `gate-cruft-no-mode-signature-comment` | Replace the stale NO_MODE_SIGNATURE transition comment | story | — | ff59da4 |
| `gate-cruft-no-style-signature-reexport` | Remove the unused NO_STYLE_SIGNATURE re-export | story | — | ff59da4 |
| `gate-docs-cache-key-model-name` | Include model.name in cache-key documentation | story | — | ff59da4 |
| `gate-docs-refresh-pattern-citations` | Refresh pattern-catalog citations shifted by writing styles | story | — | ff59da4 |
| `gate-patterns-clean-inspect-temp-dir` | Clean up inspect test temporary directories | story | — | ff59da4 |
| `gate-patterns-v0.3.0` | Patterns extracted for v0.3.0 | story | — | ff59da4 |
| `gate-tests-custom-global-source-resolution` | Verify global custom styles resolve with the global source | story | — | ff59da4 |
| `gate-tests-custom-style-sibling-retention` | Verify a bad custom style does not poison valid siblings | story | — | ff59da4 |
| `gate-tests-full-style-splice-order` | Cover style ordering with base overlay and modifier populated | story | — | ff59da4 |
| `gate-tests-style-base-reason-priority` | Cover style-over-base cache reason priority | story | — | ff59da4 |
| `gate-tests-style-config-shape-validation` | Cover malformed writing-style config field shapes | story | — | ff59da4 |
| `gate-tests-style-degrade-preserves-mode` | Verify style degradation preserves the active mode | story | — | ff59da4 |
| `gate-tests-style-inspect-handler-resolution` | Verify inspect resolves style state through its command handler | story | — | ff59da4 |
| `gate-tests-writing-style-none-seeding` | Cover project none masking a global writing style | story | — | ff59da4 |
