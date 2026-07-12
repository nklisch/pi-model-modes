# Changelog

## v0.3.0 — 2026-07-12

### Features

- Added optional global/project writing styles with four bundled prose postures: `clear`, `compact`, `explanatory`, and `expressive`.
- Added secure named custom Markdown styles with project-over-global configuration, explicit `none` masking, path containment, and live content-hash invalidation.
- Added effective writing-style visibility to `/mode:inspect`.

### Documentation

- Documented writing-style configuration, composition order, cache behavior, and custom-file security boundaries.
- Added reusable patterns for tolerant config validation and defensive cloning at module boundaries.

### Internal

- Expanded style/config/cache/inspect coverage, including graceful degradation, precedence, malformed input, and full prompt ordering.
- Removed a dead cache re-export, refreshed stale pattern citations, and fixed temporary-directory cleanup in inspect tests.

## v0.2.0 — 2026-06-22

### Features

- Added a styled footer mode indicator (`mode: ◆ …`) with per-base glyphs, modifier counts, unresolvable state, and optional cycle-keybinding hint.
- Added optional mode cycling via global `cycleKeybinding: true`, registering `Ctrl+Shift+U` forward and `Ctrl+Shift+Alt+U` backward.
- Added `/mode:inspect --prompt` to display the full assembled system prompt using the same splice path as live turns.
- Added `/mode default` management from inside pi, including project/global scopes, durable `none`, strict config writes, no-op clears, and multistage autocomplete.
- Added `/mode` autocomplete support for presets, `off`, `default`, default actions, and `--global`.

### Fixes

- Included `model.name` in the cache key so registry-side display-name changes cannot return a stale identity line.
- Hardened `/mode:inspect --prompt` to degrade gracefully when the active mode no longer resolves.
- Fixed default-management notifications for masked global defaults, no-op clears, active overrides, and surviving cross-scope defaults.

### Documentation

- Updated README, SPEC, and ARCHITECTURE for footer indicators, keybinding opt-in, `/mode none`, `/mode default`, autocomplete, inspect prompt output, and cache-key behavior.
- Added the first project pattern catalog under `.agents/skills/patterns/` plus the generated `.agents/rules/patterns.md` digest.

### Internal

- Removed dead exported types and tightened several tests that were weak or tautological.
- Bound and drained release gates for security, tests, cruft, docs, and patterns.
