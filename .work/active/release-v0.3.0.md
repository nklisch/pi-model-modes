---
id: release-v0.3.0
kind: release
stage: quality-gate
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

All configured gates have run. Release readiness now depends on draining the bound gate findings to `stage: done`.
