---
id: feature-mode-footer-indicator-refresh-wiring
kind: story
stage: review
tags: []
parent: feature-mode-footer-indicator
depends_on:
  - feature-mode-footer-indicator-footer-render
  - feature-mode-footer-indicator-cycle-opt-in
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# Footer refresh wiring (events + command/keybinding call-sites + harness + regression)

## Scope

Implement **Unit 3** of `feature-mode-footer-indicator`. Wire
`refreshModeFooter(ctx)` (from Unit 1) into the moments the effective mode can
change, so the footer updates the moment a mode is selected (not one turn
later), plus a `before_agent_start` per-turn safety net and a `session_start`
post-reseed refresh. Extend the test harness with a recording `ctx.ui` stub,
update `registration.test.ts` for the second `before_agent_start` handler, and
add the cache-stability + no-op-unset regression assertions proving the footer
does NOT perturb SPEC Invariants 2 or 3.

Depends on Units 1 + 2: imports `refreshModeFooter` from `src/footer.ts`
(Unit 1), and edits the same `extensions/index.ts` factory function Unit 2
extended (so Unit 2 must land first to avoid a conflicting factory edit).

## Units

- `extensions/index.ts` (extend the factory, additive to Unit 2):
  - register a SECOND `before_agent_start` handler —
    `(_e, ctx) => refreshModeFooter(ctx)` — the per-turn safety net (returns
    `undefined`; no prompt contribution);
  - extend the existing `session_start` handler to call
    `refreshModeFooter(ctx)` AFTER `applySessionStart(e.reason, ctx.cwd)` so
    the post-reseed default is reflected.
- `src/commands.ts` (extend `registerModeCommand`'s handler) — call
  `refreshModeFooter(ctx)` after `setActiveMode(arg)` succeeds AND after
  `clearActiveMode()` on the `off` path. The no-arg listing path and the
  unknown-preset error path do NOT mutate state → no refresh.
- `src/keybinding.ts` (extend `registerModeKeybindings`'s cycle handler) —
  call `refreshModeFooter(ctx)` after `setActiveMode(next)`. The "no presets"
  early-return does not mutate → no refresh.
- `tests/harness.ts` (extend) — add `makeUi(overrides?)` returning a recording
  `ExtensionUIContext`-shaped stub with at least `setStatus` (recorded) +
  `notify` (recorded), so footer + command tests can assert UI calls without
  the fail-fast `makeContext` Proxy biting on `ctx.ui.*`.
- `tests/registration.test.ts` (extend) — allow the second `before_agent_start`
  registration; still assert the transform handler is registered by reference
  exactly once.
- `tests/footer-wiring.test.ts` (new) — the immediate-update + event-trigger
  integration tests.
- `tests/cache-stability.test.ts` (extend) — regression: footer refresh fires
  every turn AND the prompt stays byte-identical across no-change turns.
- `tests/noop.test.ts` (extend) — regression: mode unset → footer renders
  `mode: unset` (+ hint if enabled) AND the handler's return is the
  identity-only splice.

## Implementation notes (carry-over from the feature body)

- The `before_agent_start` footer handler is a SEPARATE registration returning
  `undefined` (no `BeforeAgentStartEventResult.systemPrompt`). It runs
  alongside `handleBeforeAgentStart`; order does not matter (the footer reads
  resolver state, which is independent of the transform's cache work).
- `model_select` is deliberately NOT a trigger (footer shows no identity — see
  the feature body Design decisions).
- The `/mode` no-arg path (display-only listing) does NOT mutate state → no
  refresh. Only the `<preset>` success path and the `off` path refresh.
- The `session_start` refresh MUST run AFTER `applySessionStart` so the
  reseeded default tier is reflected; keep both calls inside the same
  `session_start` handler in the right order.

## Acceptance criteria

- [x] The factory registers a second `before_agent_start` handler (the footer
  refresh) alongside the transform handler by-reference exactly once.
  `registration.test.ts` allows the second `before_agent_start` registration;
  still asserts the transform handler is registered by reference exactly once
  (not weakened).
- [x] After `/mode <preset>` the footer updates IMMEDIATELY — the command test
  asserts `ctx.ui.setStatus` was called with `MODE_FOOTER_KEY` and the new
  preset in the text, BEFORE any turn fires.
- [x] After `/mode off` the footer updates immediately (reflects the new
  effective state — default or unset).
- [x] After a cycle keypress the footer updates immediately (keybinding
  handler test asserts `ctx.ui.setStatus` reflects the next preset).
- [x] On `session_start` the footer refreshes AFTER `applySessionStart`
  (post-reseed default reflected in the footer text).
- [x] On `before_agent_start` the footer refreshes (safety net; idempotent —
  repeated turns with no state change produce the same `setStatus` text).
- [x] Cache-stability regression: across N no-change turns with a mode set,
  `ctx.getSystemPrompt()` stays byte-identical AND `ctx.ui.setStatus` fires
  each turn (assert BOTH). The footer does NOT perturb SPEC Invariant 2.
- [x] No-op-unset regression: with mode unset, the footer renders
  `mode: unset` (+ hint if enabled) AND the handler's return is the
  identity-only splice unchanged (Invariant 3 preserved).
- [x] typecheck clean; tests green.

## Implementation notes

- Wired `refreshModeFooter(ctx)` into the factory as a separate
  `before_agent_start` handler returning `undefined`, and into the existing
  config `session_start` handler after `applySessionStart`.
- Added immediate refreshes after successful `/mode <preset>`, `/mode off`, and
  cycle-keybinding mutations; display-only listing and unknown preset paths do
  not refresh.
- Added `makeUi(overrides?)` recording UI harness plus `footer-wiring` coverage.
  Extended cache-stability and no-op-unset tests to prove footer refreshes do
  not change prompt bytes or the identity-only unset splice.
- Verified with `npm run typecheck` and `npm test`.

## Out of scope

- The footer render function — Unit 1.
- The `cycleKeybinding` config flag + factory keybinding wiring — Unit 2
  (this story's factory edit is additive to Unit 2's, on the same function —
  Unit 2 must land first).
- Any change to the cache module, the resolver's set/clear/default paths, or
  the splice. The footer is read-only on resolver state.
