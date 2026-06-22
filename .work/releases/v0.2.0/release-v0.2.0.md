---
id: release-v0.2.0
kind: release
stage: released
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
- `epic-switching-paths-keybinding-cycle` (feature) — Keybinding Cycle (Ctrl+Shift+U forward / Ctrl+Shift+Alt+U backward)
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

- `gate-docs-architecture-src-inventory` (story, gate-docs) — Architecture component tree omits source modules
- `gate-docs-architecture-test-inventory` (story, gate-docs) — Architecture tests listing is stale
- `gate-docs-readme-keybinding-opt-in` (story, gate-docs) — README omits cycleKeybinding opt-in details
- `gate-docs-readme-footer-indicator` (story, gate-docs) — README omits footer mode indicator
- `gate-docs-readme-mode-none-command` (story, gate-docs) — README omits `/mode none` command form

- `followup-cache-key-include-model-name` (story, gate-tests) — Cache key includes model.name
- `followup-cache-model-mode-priority-test` (story, gate-tests) — Cache priority regression for simultaneous model+mode changes
- `gate-tests-cache-tautological-assertion` (story, gate-tests) — Remove tautological cache assertion
- `gate-tests-keybinding-forward-cycle-pin` (story, gate-tests) — Pin forward-cycle expected preset
- `gate-tests-mode-default-footer-refresh-assertion` (story, gate-tests) — Strengthen default-write footer refresh assertion
- `gate-cruft-base-manifest-dead-type` (story, gate-cruft) — Remove dead BaseManifest export
- `gate-cruft-preset-file-dead-type` (story, gate-cruft) — Remove dead PresetFile export
- `gate-cruft-mode-default-constant-ssot` (story, gate-cruft) — Deduplicate /mode default constants
- `gate-cruft-format-mode-summary-comment` (story, gate-cruft) — Remove stale mode-summary deferral comment
- `gate-cruft-footer-source-unused-field` (story, gate-cruft) — Remove unused footer source field
- `gate-cruft-mode-default-message-type-export` (story, gate-cruft) — Unexport local mode-default message type

- `gate-patterns-v0.2.0` (story, gate-patterns) — Patterns extracted for v0.2.0

- `gate-patterns-reset-fragments-reset-name` (story, gate-patterns) — Align fragment reset seam with resetForTesting pattern

## Gate runs

- **gate-patterns** (2026-06-22) — 5 patterns codified, 1 inconsistency fixed
- **gate-cruft** (2026-06-22) — 6 findings fixed (2 high, 1 medium, 3 low)
- **gate-tests** (2026-06-22) — 5 findings fixed (1 high, 1 medium, 3 low)
- **gate-security** (2026-06-22) — 0 findings
- **gate-docs** (2026-06-22) — 5 findings fixed (2 high, 2 medium, 1 low)

## Release summary

- **Date shipped:** 2026-06-22
- **Mapping:** tag-based (`v0.2.0`)
- **Items shipped:** 55
- **Verification:** `npm run typecheck`; `npm test` (371/371)
- **Publishing mechanism:** package version bumped to `0.2.0`, git tag `v0.2.0`, pushed to origin.

## Gate totals

- **gate-security:** 0 findings
- **gate-tests:** 5 findings fixed (1 high, 1 medium, 3 low)
- **gate-cruft:** 6 findings fixed (2 high, 1 medium, 3 low)
- **gate-docs:** 5 findings fixed (2 high, 2 medium, 1 low)
- **gate-patterns:** 5 patterns codified, 1 inconsistency fixed

## Shipped items

Bodies live in git history (`delete-refs`). Recover any pruned body with
`git show <git ref>:<former path>`.

| id | title | kind | archived_atop | git ref | former path |
|----|-------|------|---------------|---------|-------------|
| `epic-fragment-library` | Fragment Library + Presets | epic | — | `4591f5e` | `.work/active/epics/epic-fragment-library.md` |
| `epic-identity-injection` | Model Identity Injection + Cache Mechanism | epic | — | `4591f5e` | `.work/active/epics/epic-identity-injection.md` |
| `epic-mode-composition` | Mode Composition Engine | epic | — | `4591f5e` | `.work/active/epics/epic-mode-composition.md` |
| `epic-scaffold-handler` | Scaffold Extension + No-Op Handler | epic | — | `4591f5e` | `.work/active/epics/epic-scaffold-handler.md` |
| `epic-switching-paths` | Mode Switching Paths | epic | — | `4591f5e` | `.work/active/epics/epic-switching-paths.md` |
| `epic-fragment-library-agency-axis` | Agency Axis Fragments (4) | feature | — | `4591f5e` | `.work/active/features/epic-fragment-library-agency-axis.md` |
| `epic-fragment-library-base-overlays` | Base Voice Overlays + base.json | feature | — | `4591f5e` | `.work/active/features/epic-fragment-library-base-overlays.md` |
| `epic-fragment-library-modifiers` | Modifier Fragments (~11) | feature | — | `4591f5e` | `.work/active/features/epic-fragment-library-modifiers.md` |
| `epic-fragment-library-preset-bundles` | Preset Bundles (presets.json catalog) | feature | — | `4591f5e` | `.work/active/features/epic-fragment-library-preset-bundles.md` |
| `epic-fragment-library-quality-axis` | Quality Axis Fragments (3) | feature | — | `4591f5e` | `.work/active/features/epic-fragment-library-quality-axis.md` |
| `epic-fragment-library-scope-axis` | Scope Axis Fragments (3) | feature | — | `4591f5e` | `.work/active/features/epic-fragment-library-scope-axis.md` |
| `epic-identity-injection-cache-and-change-signal` | Cache Key + Per-Turn Result Cache + Change-Signal Ring Buffer | feature | — | `4591f5e` | `.work/active/features/epic-identity-injection-cache-and-change-signal.md` |
| `epic-identity-injection-cache-stability-test` | Cache Stability Test — Invariant 2 (byte-identical across no-change turns) | feature | — | `4591f5e` | `.work/active/features/epic-identity-injection-cache-stability-test.md` |
| `epic-identity-injection-handler-integration` | Handler Integration — Identity Injection + Cache Wiring | feature | — | `4591f5e` | `.work/active/features/epic-identity-injection-handler-integration.md` |
| `epic-identity-injection-identity-derivation` | Identity Derivation + Provider Display-Name Map | feature | — | `4591f5e` | `.work/active/features/epic-identity-injection-identity-derivation.md` |
| `epic-identity-injection-mode-inspect` | /mode:inspect Command (reads the change signal) | feature | — | `4591f5e` | `.work/active/features/epic-identity-injection-mode-inspect.md` |
| `epic-mode-composition-deterministic-splice` | Deterministic Splice — assemble identity + plan + e.systemPrompt in fixed order | feature | — | `4591f5e` | `.work/active/features/epic-mode-composition-deterministic-splice.md` |
| `epic-mode-composition-engine-invariant-tests` | Engine Invariant Tests — full Invariant 1 + mode cache-stability + deterministic order | feature | — | `4591f5e` | `.work/active/features/epic-mode-composition-engine-invariant-tests.md` |
| `epic-mode-composition-fragment-loader` | Fragment Loader — convention-directory discovery + stat-invalidated content cache | feature | — | `4591f5e` | `.work/active/features/epic-mode-composition-fragment-loader.md` |
| `epic-mode-composition-handler-wiring` | Handler Wiring — engine into the per-turn handler + inspect Mode line | feature | — | `4591f5e` | `.work/active/features/epic-mode-composition-handler-wiring.md` |
| `epic-mode-composition-mode-resolver` | Mode Resolver — specifier -> ResolvedMode, materialized ModePlan + content-hash signature | feature | — | `4591f5e` | `.work/active/features/epic-mode-composition-mode-resolver.md` |
| `epic-mode-composition-preset-table` | Preset Table — ResolvedMode type + presets.json schema/loader | feature | — | `4591f5e` | `.work/active/features/epic-mode-composition-preset-table.md` |
| `epic-scaffold-handler-noop-handler` | No-Op Handler + Test Harness (Invariants 3 and 1) | feature | — | `4591f5e` | `.work/active/features/epic-scaffold-handler-noop-handler.md` |
| `epic-scaffold-handler-package-skeleton` | Package Skeleton (loadable pi-package) | feature | — | `4591f5e` | `.work/active/features/epic-scaffold-handler-package-skeleton.md` |
| `epic-switching-paths-config-default` | Config Default + Effective-Mode State (override > default > unset) | feature | — | `4591f5e` | `.work/active/features/epic-switching-paths-config-default.md` |
| `epic-switching-paths-keybinding-cycle` | Keybinding Cycle (Ctrl+Shift+U forward / Ctrl+Shift+Alt+U backward) | feature | — | `4591f5e` | `.work/active/features/epic-switching-paths-keybinding-cycle.md` |
| `epic-switching-paths-mode-command` | /mode Command Family | feature | — | `4591f5e` | `.work/active/features/epic-switching-paths-mode-command.md` |
| `feature-mode-default-management` | `/mode default` — manage the durable default from inside pi | feature | — | `4591f5e` | `.work/active/features/feature-mode-default-management.md` |
| `feature-mode-inspect-prompt-flag` | `/mode:inspect --prompt` debug flag | feature | — | `4591f5e` | `.work/active/features/feature-mode-inspect-prompt-flag.md` |
| `feature-mode-footer-indicator-cycle-opt-in` | Cycle-keybinding opt-in (`cycleKeybinding` config flag + factory wiring) | story | — | `4591f5e` | `.work/active/stories/feature-mode-footer-indicator-cycle-opt-in.md` |
| `feature-mode-footer-indicator-footer-render` | Footer render core + seam (`src/footer.ts`) | story | — | `4591f5e` | `.work/active/stories/feature-mode-footer-indicator-footer-render.md` |
| `feature-mode-footer-indicator-refresh-wiring` | Footer refresh wiring (events + command/keybinding call-sites + harness + regression) | story | — | `4591f5e` | `.work/active/stories/feature-mode-footer-indicator-refresh-wiring.md` |
| `followup-cache-key-include-model-name` | Cache Key Must Include model.name (Invariant 2 bug) | story | — | `4591f5e` | `.work/active/stories/followup-cache-key-include-model-name.md` |
| `followup-cache-model-mode-priority-test` | Add Cache Priority Regression Test for Simultaneous Model + Mode Changes | story | — | `4591f5e` | `.work/active/stories/followup-cache-model-mode-priority-test.md` |
| `gate-cruft-base-manifest-dead-type` | Remove dead BaseManifest export | story | — | `4591f5e` | `.work/active/stories/gate-cruft-base-manifest-dead-type.md` |
| `gate-cruft-footer-source-unused-field` | Remove unused footer source field | story | — | `4591f5e` | `.work/active/stories/gate-cruft-footer-source-unused-field.md` |
| `gate-cruft-format-mode-summary-comment` | Remove stale mode-summary deferral comment | story | — | `4591f5e` | `.work/active/stories/gate-cruft-format-mode-summary-comment.md` |
| `gate-cruft-mode-default-constant-ssot` | Deduplicate /mode default constants | story | — | `4591f5e` | `.work/active/stories/gate-cruft-mode-default-constant-ssot.md` |
| `gate-cruft-mode-default-message-type-export` | Unexport local mode-default message type | story | — | `4591f5e` | `.work/active/stories/gate-cruft-mode-default-message-type-export.md` |
| `gate-cruft-preset-file-dead-type` | Remove dead PresetFile export | story | — | `4591f5e` | `.work/active/stories/gate-cruft-preset-file-dead-type.md` |
| `gate-docs-architecture-src-inventory` | Architecture component tree omits source modules | story | — | `4591f5e` | `.work/active/stories/gate-docs-architecture-src-inventory.md` |
| `gate-docs-architecture-test-inventory` | Architecture tests listing is stale | story | — | `4591f5e` | `.work/active/stories/gate-docs-architecture-test-inventory.md` |
| `gate-docs-readme-footer-indicator` | README omits footer mode indicator | story | — | `4591f5e` | `.work/active/stories/gate-docs-readme-footer-indicator.md` |
| `gate-docs-readme-keybinding-opt-in` | README omits cycleKeybinding opt-in details | story | — | `4591f5e` | `.work/active/stories/gate-docs-readme-keybinding-opt-in.md` |
| `gate-docs-readme-mode-none-command` | README omits `/mode none` command form | story | — | `4591f5e` | `.work/active/stories/gate-docs-readme-mode-none-command.md` |
| `gate-patterns-reset-fragments-reset-name` | Align fragment reset seam with resetForTesting pattern | story | — | `4591f5e` | `.work/active/stories/gate-patterns-reset-fragments-reset-name.md` |
| `gate-patterns-v0.2.0` | Patterns extracted for v0.2.0 | story | — | `4591f5e` | `.work/active/stories/gate-patterns-v0.2.0.md` |
| `gate-tests-cache-tautological-assertion` | Remove tautological cache assertion | story | — | `4591f5e` | `.work/active/stories/gate-tests-cache-tautological-assertion.md` |
| `gate-tests-keybinding-forward-cycle-pin` | Pin forward-cycle expected preset | story | — | `4591f5e` | `.work/active/stories/gate-tests-keybinding-forward-cycle-pin.md` |
| `gate-tests-mode-default-footer-refresh-assertion` | Strengthen default-write footer refresh assertion | story | — | `4591f5e` | `.work/active/stories/gate-tests-mode-default-footer-refresh-assertion.md` |
| `story-default-autocomplete-multistage` | `/mode default` three-stage autocomplete | story | — | `4591f5e` | `.work/active/stories/story-default-autocomplete-multistage.md` |
| `story-default-command-surface` | `/mode default` command surface (commands.ts) | story | — | `4591f5e` | `.work/active/stories/story-default-command-surface.md` |
| `story-default-config-writer` | Default-mode writer + scope reader (config.ts) | story | — | `4591f5e` | `.work/active/stories/story-default-config-writer.md` |
| `story-mode-autocomplete-provider-seam` | `/mode` autocomplete — pi provider seam + factory wiring | story | — | `4591f5e` | `.work/active/stories/story-mode-autocomplete-provider-seam.md` |
| `story-mode-autocomplete-suggestion-helpers` | `/mode` autocomplete — pure suggestion helpers | story | — | `4591f5e` | `.work/active/stories/story-mode-autocomplete-suggestion-helpers.md` |
