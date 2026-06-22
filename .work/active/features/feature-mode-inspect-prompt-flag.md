---
id: feature-mode-inspect-prompt-flag
kind: feature
stage: drafting
tags: []
parent: null
depends_on: []
release_binding: null
gate_origin: null
created: 2026-06-21
updated: 2026-06-21
---

# `/mode:inspect --prompt` debug flag

## Brief

Add an optional `--prompt` flag to `/mode:inspect` that emits the FULL
assembled system prompt — the same string the `before_agent_start` handler
splices together (identity line + base + agency + quality + scope +
modifiers + pi's base) — so a developer can see exactly what the model will
receive on the next turn without running a turn or grepping session JSON.

Today `/mode:inspect` shows four lines (mode summary, identity line,
last-change reason, cache key). It does NOT show the assembled prompt
itself, so debugging "what did the plugin actually produce?" requires
either running a turn and reading session JSON, or re-deriving the splice
order by hand. This feature closes that gap with one opt-in flag.

## Why a flag, not a new command

`/mode:inspect` is already the diagnostic surface. A `--prompt` flag keeps
the diagnostic family together (one command, two verbosity levels) rather
than fragmenting debug tooling across commands. The bare form stays terse
(the default); the flagged form expands to include the full prompt.

## Design sketch (locked at scope time, fleshed at design time)

- **Arg parsing.** Detect `--prompt` (and only `--prompt`) anywhere in the
  arg string. Unknown flags → error toast naming the bad flag and leaving
  the bare panel intact. Empty/whitespace arg → bare panel (current behavior).
- **Output shape (with `--prompt`).** The existing four lines, then a blank
  separator, then a `System prompt:` header, then the assembled prompt as a
  fenced block. Fenced so terminal-rendered markdown (pi's default) wraps
  and scrolls cleanly.
- **Source of truth.** Reuse the handler's assembly path
  (`src/handler.ts` exposes the per-turn splice; `src/assemble.ts` is the
  PURE assembler). The flag must produce byte-identical output to what the
  next turn will receive — never a parallel re-implementation. The handler's
  cache is per-turn, so calling the assembler with the same inputs is
  deterministic and cheap.
- **Mode-unset behavior.** With no mode active, the assembled prompt is just
  `identity + pi base` (the no-op-unset invariant). The flag still works —
  it shows that minimal assembly, which is itself the diagnostic answer
  ("yes, only identity is being added").
- **No new dependencies.** Pure inline string building; no prompt-pretty-
  printing library.

## Acceptance criteria

- `/mode:inspect` (bare) is unchanged byte-for-byte.
- `/mode:inspect --prompt` emits the four existing lines, a blank line, a
  `System prompt:` header, then the assembled prompt in a fenced block.
- The assembled bytes match what `handleBeforeAgentStart` would return for
  the current model + effective mode + pi base (verified by a test that
  calls both paths and asserts equality).
- Unknown flag → error toast; bare panel not emitted; resolver state
  untouched.
- Mode-unset + `--prompt` shows identity + pi base only (no axis fragments).

## Out of scope

- A `/mode:inspect --cache` variant dumping the change-signal entry history
  (separate future feature if needed).
- Persisting the assembled prompt to a file (the panel is enough for debug).

## Sizing

Single stride. ~40-60 LoC across `src/commands.ts` (arg parse + render
branch) and the assembler call site, plus 4-6 unit tests in
`tests/commands.test.ts`.
