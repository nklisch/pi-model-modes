---
id: release-v0.2.0
kind: release
stage: quality-gate
tags: []
parent: null
depends_on: []
release_binding: v0.2.0
gate_origin: null
created: 2026-06-22
updated: 2026-06-22
---

# Release v0.2.0

## Bound items

- `epic-fragment-library` (epic) — Fragment Library + Presets
- `epic-identity-injection` (epic) — Model Identity Injection + Cache Mechanism
- `epic-mode-composition` (epic) — Mode Composition Engine
- `epic-scaffold-handler` (epic) — Scaffold Extension + No-Op Handler
- `epic-switching-paths` (epic) — Mode Switching Paths
- `epic-fragment-library-agency-axis` (feature) — Agency Axis Fragments (4)
- `epic-fragment-library-base-overlays` (feature) — Base Voice Overlays + base.json
- `epic-fragment-library-modifiers` (feature) — Modifier Fragments (~11)
- `epic-fragment-library-preset-bundles` (feature) — Preset Bundles (presets.json catalog)
- `epic-fragment-library-quality-axis` (feature) — Quality Axis Fragments (3)
- `epic-fragment-library-scope-axis` (feature) — Scope Axis Fragments (3)
- `epic-identity-injection-cache-and-change-signal` (feature) — Cache Key + Per-Turn Result Cache + Change-Signal Ring Buffer
- `epic-identity-injection-cache-stability-test` (feature) — Cache Stability Test — Invariant 2 (byte-identical across no-change turns)
- `epic-identity-injection-handler-integration` (feature) — Handler Integration — Identity Injection + Cache Wiring
- `epic-identity-injection-identity-derivation` (feature) — Identity Derivation + Provider Display-Name Map
- `epic-identity-injection-mode-inspect` (feature) — /mode:inspect Command (reads the change signal)
- `epic-mode-composition-deterministic-splice` (feature) — Deterministic Splice — assemble identity + plan + e.systemPrompt in fixed order
- `epic-mode-composition-engine-invariant-tests` (feature) — Engine Invariant Tests — full Invariant 1 + mode cache-stability + deterministic order
- `epic-mode-composition-fragment-loader` (feature) — Fragment Loader — convention-directory discovery + stat-invalidated content cache
- `epic-mode-composition-handler-wiring` (feature) — Handler Wiring — engine into the per-turn handler + inspect Mode line
- `epic-mode-composition-mode-resolver` (feature) — Mode Resolver — specifier -> ResolvedMode, materialized ModePlan + content-hash signature
- `epic-mode-composition-preset-table` (feature) — Preset Table — ResolvedMode type + presets.json schema/loader
- `epic-scaffold-handler-noop-handler` (feature) — No-Op Handler + Test Harness (Invariants 3 and 1)
- `epic-scaffold-handler-package-skeleton` (feature) — Package Skeleton (loadable pi-package)
- `epic-switching-paths-config-default` (feature) — Config Default + Effective-Mode State (override > default > unset)
- `epic-switching-paths-keybinding-cycle` (feature) — Keybinding Cycle (Ctrl+M forward / Shift+Ctrl+M backward)
- `epic-switching-paths-mode-command` (feature) — /mode Command Family
- `feature-mode-default-management` (feature) — `/mode default` — manage the durable default from inside pi
- `feature-mode-inspect-prompt-flag` (feature) — `/mode:inspect --prompt` debug flag
- `feature-mode-footer-indicator-cycle-opt-in` (story) — Cycle-keybinding opt-in (`cycleKeybinding` config flag + factory wiring)
- `feature-mode-footer-indicator-footer-render` (story) — Footer render core + seam (`src/footer.ts`)
- `feature-mode-footer-indicator-refresh-wiring` (story) — Footer refresh wiring (events + command/keybinding call-sites + harness + regression)
- `story-default-autocomplete-multistage` (story) — `/mode default` three-stage autocomplete
- `story-default-command-surface` (story) — `/mode default` command surface (commands.ts)
- `story-default-config-writer` (story) — Default-mode writer + scope reader (config.ts)
- `story-mode-autocomplete-provider-seam` (story) — `/mode` autocomplete — pi provider seam + factory wiring
- `story-mode-autocomplete-suggestion-helpers` (story) — `/mode` autocomplete — pure suggestion helpers

## Gate runs

Pending.
