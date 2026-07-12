---
id: story-style-command-ui-autocomplete
kind: story
stage: implementing
tags: []
parent: feature-style-command-family
depends_on: [story-style-selection-tiers-config]
release_binding: null
gate_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Add `/style` command UI, autocomplete, and documentation

## Scope

Implement Units 3–5 from the parent feature design on top of the completed
style-tier/config contract: add the `/style` session/default command family,
display-only status/catalog panels, truthful notifications, live multi-stage
TUI autocomplete, factory wiring, inspect provenance, and rolling docs.

## Acceptance criteria

- [ ] `/style`, `/style <name|none>`, `/style off`, and `/style default ...`
  implement the exact grammar and tier semantics in the parent design;
  `default none` persists suppression and `default off` deletes the key.
- [ ] No-argument panels are display-only and show selection plus fragment
  provenance without triggering an agent turn.
- [ ] Unknown names, malformed flags, and config failures preserve previous
  state and report precise errors.
- [ ] Three-stage autocomplete includes bundled/custom names and delegates every
  non-style, failure, abort, and non-TUI path.
- [ ] `/mode:inspect` reports command-selected style provenance accurately;
  `StyleInspectInfo` and its exact-string test table distinguish selection source
  from renamed fragment source.
- [ ] Style commands do not change active mode or the mode-only footer.
- [ ] README, SPEC, and ARCHITECTURE describe the final command/config model and
  explicitly limit styles to conversational communication—not code, comments,
  docs, tools, autonomy, scope, or problem-solving strategy.
- [ ] Factory and integration tests enumerate `STYLE_COMMAND`, the additional
  TUI autocomplete `session_start` handler, and no unintended Pi seams.
- [ ] `npm test` and `npm run typecheck` pass.

## Design reference

See `feature-style-command-family` Units 3–5, Testing, and Risks.
