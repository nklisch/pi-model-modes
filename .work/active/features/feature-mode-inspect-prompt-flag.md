---
id: feature-mode-inspect-prompt-flag
kind: feature
stage: done
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

## Design (locked 2026-06-21)

### Source-of-truth finding

`ctx.getSystemPrompt()` returns the **already-spliced** prompt from the last
successful turn (`session.systemPrompt`, set by `agent-session.js:819` to
`result.systemPrompt` when our handler returned one). Re-assembling on top
of it would double-splice identity + mode fragments. The clean source for
pi's unspliced base is the `e.systemPrompt` argument the handler already
receives every turn.

### Locked approach

1. **Module-side base-prompt memo in `src/handler.ts`.** The handler sets
   `lastBaseSystemPrompt = e.systemPrompt` at the top of every invocation.
   Getter `getLastBaseSystemPrompt(): string | undefined`. Undefined until
   the first turn has run.
2. **Pure `assembleForInspect(model, baseSystemPrompt)` in `src/handler.ts`.**
   Same two-path splice as `handleBeforeAgentStart`: when `plan.mode ===
   undefined` use the identity-only single-`\n` form, else call
   `assembleSystemPrompt(identity, plan, base)`. This is the SINGLE source
   of truth for the splice — the handler is refactored to call it too, so
   the inspect view and the live turn can't drift.
3. **Inspect command (`src/commands.ts`).** `renderModeInspect` gains an
   optional `assembledPrompt?: string` param; when present, the panel
   appends a blank line + `System prompt:` header + a fenced-code-block
   containing the bytes. The handler:
   - Parses `--prompt` (only flag accepted). Unknown flag → error toast,
     bare panel not emitted, resolver untouched.
   - When `--prompt`: read `getLastBaseSystemPrompt()`. If undefined (no
     turn has run yet), append `System prompt: (no turn has run yet — run a
     turn to populate)` instead of the fenced block. Otherwise call
     `assembleForInspect(ctx.model, base)` and pass the result to
     `renderModeInspect`.
   - Bare `/mode:inspect` (no flag) is byte-for-byte unchanged.

### Parser contract

- Arg string is split on whitespace, trimmed. Empty → bare panel.
- The only accepted token is `--prompt` (case-sensitive, no `=value` form).
- Unknown token / extra token / repeated `--prompt` → error toast naming
  the bad token, no panel emit, no resolver mutation.

### Why this is byte-identical to the next turn

The inspect view calls the SAME `assembleForInspect` the handler calls. The
only approximation is the base prompt: the memo holds pi's base from the
most recent turn, not from the not-yet-run next turn. For a debug surface
this is the right approximation — it shows what the splice WOULD produce
right now, and the base changes only when tools/skills/config do.

### Out of scope

- A `--cache` variant dumping change-signal entry history (separate feature).
- Persisting the assembled prompt to a file.
- Re-running the cache (would pollute cache state).

## Sizing

Single stride. ~40-60 LoC across `src/commands.ts` (arg parse + render
branch) and the assembler call site, plus 4-6 unit tests in
`tests/commands.test.ts`.

## Implementation notes (2026-06-21)

Implemented and verified.

- `src/handler.ts`
  - Added `lastBaseSystemPrompt` memo (unspliced base from `BeforeAgentStartEvent.systemPrompt`).
  - Added `getLastBaseSystemPrompt()` + `resetHandlerForTesting()`.
  - Added `assembleForInspect(model, baseSystemPrompt)` and refactored the live handler through the same `spliceSystemPrompt` helper so `/mode:inspect --prompt` and the live turn share one splice path.
- `src/commands.ts`
  - `/mode:inspect` now accepts a single optional `--prompt` flag.
  - Unknown/repeated/extra flags produce error toasts and no panel emit.
  - With `--prompt`, the panel appends `System prompt:` + fenced block; if no turn has run yet it emits an explicit sentinel.
- `tests/commands.test.ts`
  - Added render append-block tests, single-source byte-equality tests against `handleBeforeAgentStart`, no-model fallback, `--prompt` command-path tests, and parser rejection matrix.

Verification: `npm run typecheck`; `npm test` (350/350 after the full `/mode default` work).

## Review (2026-06-21)

Verdict: Approve — feature verified by tests + Codex/Opus final review.

Verification:

- `npm run typecheck` clean
- `npm test` 360/360 passing
- Opus final review: PASS WITH NITS; no blockers/high/medium findings for inspect.
- Codex focused re-review: PASS; markdown-fence nit fixed.

Accepted non-blocking finding fixed before approval:

- Codex noted that a fixed triple-backtick fence could be closed early by a
  system prompt containing fenced code. Fixed with `formatFencedBlock`, which
  chooses a fence longer than any backtick run in the prompt; tests cover this.

## Post-approval grouped review follow-up (2026-06-22)

Additional requested GLM 5.2 + Opus grouped reviews over the five feature/story
items found no blockers. Accepted GLM's important graceful-degradation finding:

- `/mode:inspect --prompt` now matches bare inspect when the active mode no
  longer resolves. Instead of throwing from `assembleForInspect`, it emits the
  diagnostic panel with `Mode: (unresolvable — ...)` and a prompt-block sentinel
  `(could not assemble — ...)`.

Verification after the follow-up: `npm run typecheck`; `npm test` (367/367).
