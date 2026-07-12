---
id: gate-tests-style-inspect-handler-resolution
kind: story
stage: implementing
tags: [testing]
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: tests
created: 2026-07-12
updated: 2026-07-12
---

# Verify inspect resolves style state through its command handler

## Priority
Medium

## Spec reference
Item: `feature-configurable-writing-styles`
Acceptance criterion: `/mode:inspect` emits the effective style and source for bundled, custom, none, unset, and unresolvable states.

## Gap type
Renderer states are covered, but the registered handler's resolver-to-render wiring is only exercised with style unset.

## Suggested test
Seed a custom project style, invoke the registered inspect handler, and assert the emitted panel contains `Style: <name> (custom, project)`; include a real unresolvable resolver case if the harness permits.

## Test location
`tests/commands.test.ts`
