---
id: epic-identity-injection-mode-inspect
kind: feature
stage: drafting
tags: [tests]
parent: epic-identity-injection
depends_on: [epic-identity-injection-cache-and-change-signal, epic-identity-injection-identity-derivation]
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# /mode:inspect Command (reads the change signal)

## Brief

This feature delivers the `/mode:inspect` command, folded into THIS epic per
the epicize decision because it consumes only this epic's change signal (it
does not depend on modes). It renders a plain-text block to the message
stream — mode [minimal/absent for this epic — no mode yet], current identity,
the last-change reason and detail, the turn offset ("N turns ago"), and the
current cache key — reading the change-signal ring buffer's read API plus
deriving the current identity line. The exact rendered shape is
ARCHITECTURE's example block:

```
Mode: flow  (base:chill • agency:autonomous • scope:adjacent • +flow)
Identity: GLM-4.6 (Zhipu AI)
Effective prompt last changed: 3 turns ago — reason: model switched
                                         (zai/glm-4.5 → zai/glm-4.6)
Cache key: 9f3a...c1e2
```

For this epic the `Mode:` line is minimal (no mode selected yet — no axes,
no modifiers); the substantive fields are Identity, last-change reason, and
the cache key. Output is plain text in the message stream (per the epic's
locked design decision — NOT a custom editor-replacing UI overlay for v1).

This feature does NOT cover: the change-signal ring buffer or read API
(cache-and-change-signal), the identity derivation (identity-derivation),
mode/axis/modifier rendering (later epics populate the `Mode:` line), or the
handler (handler-integration). It registers the command in
`extensions/index.ts` (edit, don't overwrite — same co-ownership discipline
as the predecessor) and adds the rendering logic (likely `src/commands.ts`
per ARCHITECTURE's component map).

## Epic context

- Parent epic: `epic-identity-injection`
- Position in epic: **consumer of both foundations, parallel to
  handler-integration and cache-stability-test.** It reads the
  cache-and-change-signal read API (last-change reason/detail, turn offset,
  current key) and derives the current identity via identity-derivation. It
  does not depend on handler-integration (it can surface the current
  identity and last-change reason whether or not the handler has run this
  session) and is not on the critical path. It is the epic's one user-facing
  command surface.

## Foundation references

- `docs/SPEC.md` — "Cache key and the change signal" (the change signal is
  what `/mode:inspect` reads to report *why* the effective prompt last
  changed and *when*).
- `docs/ARCHITECTURE.md` — "Cache and change signal (`src/cache.ts`)" (the
  `/mode:inspect` example output block — the canonical render shape),
  "Components" (`src/commands.ts` as the command module, `extensions/index.ts`
  as the single registration surface).
- `docs/VISION.md` — "What success looks like" (the user can see the
  effective prompt's last-change reason — the observability payoff of the
  change signal).

## Inherited design decisions (from parent epic)

These are locked in the epic's `## Design decisions`; this feature inherits
them and must not re-litigate:

- **`/mode:inspect` output**: plain text rendered to the message stream
  (not a custom editor-replacing UI overlay) for v1; reads the change-signal
  ring buffer; format per ARCHITECTURE's example block.
- **Folded into this epic** (not deferred to a modes epic): the command
  consumes only this epic's change signal, so it belongs here.
- **Identity format**: reuses identity-derivation's `deriveIdentityLine` for
  the `Identity:` field.

<!-- The design pass on this feature (`/agile-workflow:feature-design`) fills
in the command registration (pi's `registerCommand` / command API — verify
the exact surface against `@earendil-works/pi-coding-agent` types), the
plain-text render function, how the minimal no-mode `Mode:` line renders for
v1, the edge case when no turn has run yet (empty ring buffer / no lastResult),
and the test (invokes the command against a stubbed cache read API; asserts
the rendered text matches the canonical shape). -->

## Codex consult requirements (folded in from decomposition review)

- **Unset wording must be precise** (avoid rework when modes land). Identity
  is NOT a mode, so the output must not imply it is. Render `Mode: unset`
  (or `Mode: none`) when no mode is active — NOT `Mode: identity` or anything
  that conflates identity with a mode. Design the `Mode:` line around a
  **mode-summary formatter** that currently returns `unset`/`none` and later
  fills in axes/modifiers when `epic-mode-composition` lands, so this feature
  doesn't need rework.
- The `Identity:` field uses `deriveIdentityLine` (reuses identity-derivation).
  Render it on every inspect call (identity is always active), independent of
  whether a mode is set.
