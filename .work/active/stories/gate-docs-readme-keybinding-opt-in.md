---
id: gate-docs-readme-keybinding-opt-in
kind: story
stage: done
tags: [documentation]
parent: null
depends_on: []
release_binding: v0.2.0
gate_origin: docs
created: 2026-06-22
updated: 2026-06-22
---

# README omits cycleKeybinding opt-in details

## Gate finding

- **Gate**: docs
- **Release**: `v0.2.0`
- **Severity**: Medium
- **Drift category**: readme-staleness
- **Location**: `README.md:57-61`

## Resolution

Extended the Keybindings section with the global `cycleKeybinding: true` opt-in, `Ctrl+Shift+U` forward shortcut, `Ctrl+Shift+Alt+U` backward shortcut, and footer-hint behavior.

## Verification

- Rolling-foundation doc fix applied in the same release-gate pass.
- `npm run typecheck` and `npm test` are run after gate fixes before release shipping.
