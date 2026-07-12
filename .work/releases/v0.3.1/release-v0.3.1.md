---
id: release-v0.3.1
kind: release
stage: released
tags: []
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Release v0.3.1

## Bound items

- `feature-style-command-family` (feature, late-bound archived stub; completed atop `v0.3.0`)
- `story-style-selection-tiers-config` (story, late-bound archived stub; completed atop `v0.3.0`)
- `story-style-command-ui-autocomplete` (story, late-bound archived stub; completed atop `v0.3.0`)

## Gate runs

- **gate-security** (2026-07-12) — 3 findings (Critical=0, High=0, Medium=0, Low=3)
- **gate-tests** (2026-07-12) — 13 coverage gaps (Critical=1, High=1, Medium=7, Low=4; tautological=0)
- **gate-cruft** (2026-07-12) — 4 findings (High=0, Medium=2, Low=2)
- **gate-docs** (2026-07-12) — 6 findings (changelog-gap=1, pattern-skill-staleness=4, foundation-doc-assertion=1)
- **gate-patterns** (2026-07-12) — 2 patterns extracted; 2 in-bundle inconsistencies tracked (2 out-of-bundle observations rejected)

All configured gates ran. Bound Critical/High test gaps and High-confidence documentation drift were corrected and reviewed before shipping.

## Deferred gate findings

Medium and Low findings were explicitly deferred and unbound: 7 complementary test gaps, 2 cleanup opportunities, 1 architecture-tree completeness update, 2 pattern inconsistencies, 3 security hardening ideas, 4 low test ideas, and 2 low cleanup ideas. They remain tracked for later prioritization and do not represent known failing behavior in v0.3.1.

## Release

- **Date shipped:** 2026-07-12
- **Mapping:** tag-based
- **Version:** v0.3.1
- **Items shipped:** 11
- **Gate findings:** security 3; tests 13; cruft 4; docs 6; patterns 2 extracted + 2 tracked inconsistencies
- **Publishing:** annotated git tag `v0.3.1` pushed with `main` to `origin`
- **Verification:** 28 test files / 469 tests passed; TypeScript typecheck passed
- **Retention:** bodies retained on disk for this release because the execution harness blocked the configured destructive `delete-refs` disposal; git provenance remains recorded below

## Shipped items

Bodies are retained under `.work/releases/v0.3.1/items/` or as existing archive stubs; full historical bodies remain recoverable with `git show <git ref>:<former path>`.

| id | title | kind | archived_atop | git ref |
|----|-------|------|---------------|---------|
| `feature-style-command-family` | `/style` command family | feature | v0.3.0 | 8c3b95f |
| `story-style-selection-tiers-config` | Add style selection tiers and durable config management | story | v0.3.0 | 8d2431d |
| `story-style-command-ui-autocomplete` | Add `/style` command UI, autocomplete, and documentation | story | v0.3.0 | a70e317 |
| `gate-tests-style-catalog-defensive-copy` | Verify style catalog results cannot mutate internal state | story | — | fcf19b7 |
| `gate-tests-none-selection-provenance` | Cover none-style selection provenance at every tier | story | — | fcf19b7 |
| `gate-docs-pure-core-citations` | Refresh pure-core pattern command citations | story | — | fcf19b7 |
| `gate-docs-stateful-reset-citations` | Refresh stateful-reset config citations | story | — | fcf19b7 |
| `gate-docs-enoent-config-citation` | Refresh ENOENT config-reader citation | story | — | fcf19b7 |
| `gate-docs-resolver-degrade-citations` | Refresh resolver-degradation command citations | story | — | fcf19b7 |
| `gate-docs-v031-changelog` | Add the v0.3.1 changelog entry | story | — | fcf19b7 |
| `gate-patterns-v0.3.1` | Patterns extracted for v0.3.1 | story | — | fcf19b7 |
