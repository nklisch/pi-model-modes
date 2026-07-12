---
id: feature-configurable-writing-styles
kind: feature
stage: drafting
tags: [security, tests, docs]
parent: null
depends_on: []
release_binding: null
gate_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Configurable writing styles

## Brief

Add an optional writing-style layer that controls how the agent communicates without changing how a mode approaches the work. A single selected style applies across every mode; presets continue to own only behavioral concerns such as agency, quality, scope, and modifiers.

The style selection is configured through the existing plugin-owned global/project configuration, with project selection overriding global selection and an absent selection injecting nothing. Users can choose one of four bundled styles or register named Markdown files for their own styles. Custom style content must participate in the same deterministic assembly and cache invalidation guarantees as bundled fragments.

This separates communication posture from task posture. Switching from `debug` to `create`, for example, should not unexpectedly change how terse or explanatory the agent is. Conversely, changing the writing style should not alter autonomy, implementation quality, or edit scope.

## Strategic decisions

- **Selection model:** One style applies across every mode. Styles are not preset fields and are not selected per mode.
- **Configuration precedence:** Style selection follows the plugin's existing project-over-global configuration model. This is independent of mode override/default precedence.
- **Optional by default:** No style is selected on fresh installs, preserving current prompt bytes and behavior until the user opts in.
- **Custom styles:** Global and project config can register names that resolve to user-authored Markdown files. The design must resolve relative paths from the defining config file and prevent a project config from reading arbitrary sensitive files into the system prompt.
- **Initial built-ins:** Ship `clear`, `compact`, `explanatory`, and `expressive`.
- **Behavioral boundary:** Writing styles govern user-facing prose only. Code-comment policy, documentation creation, implementation scope, and tool-use policy remain outside the style fragments.

## Initial style direction

### `clear`

An improved version of the existing `../claude-code-modes/prompts/base/text-output.md` posture:

- Lead with the answer, result, or immediate plan.
- Keep progress visible with one-sentence updates at meaningful milestones, not a narration of every tool call.
- Write complete sentences that make sense to a reader joining cold; avoid unexplained shorthand.
- Match detail to the task. Simple questions need direct answers; substantive work gets enough structure to communicate decisions, verification, and remaining risk.
- Do not expose internal deliberation. State conclusions and the reasons useful to the user.
- Close with outcome, verification, and next step when those are relevant; do not force a formal summary onto a trivial response.

Compared with the source style, this removes unrelated rules about code comments and planning documents and relaxes the rigid “one or two sentences, nothing else” closing rule so important verification is not lost.

### `compact`

Answer-first, minimal prose:

- Use the shortest complete response that preserves important decisions, failures, and verification.
- Skip preamble, restatement, and routine progress updates.
- Prefer short paragraphs or bullets when they improve scanning.
- Surface blockers and changed direction immediately.

### `explanatory`

Shared-understanding prose:

- Lead with the recommendation or conclusion, then explain why.
- Include relevant context, trade-offs, and a concrete example when it reduces ambiguity.
- Distinguish verified facts from inferences and unresolved questions.
- Use headings and diagrams only when the material earns them.
- Explain decisions without narrating private chain-of-thought.

### `expressive`

Warm, vivid, technically precise prose:

- Use active voice, concrete language, varied sentence rhythm, and restrained personality.
- Use analogy or metaphor only when it makes a technical idea clearer.
- Allow a dry aside or moment of delight when it fits the work.
- Avoid forced jokes, ornamental prose, emojis, and personality that competes with the answer.

## Scope

In scope:

- A dedicated optional writing-style fragment slot, independent of `ResolvedMode`.
- Bundled fragments for the four initial styles.
- Config keys for selecting a style and registering named custom style files at global/project scope.
- Strict boundary validation for style names, config shape, file extension, and safe path resolution.
- Deterministic assembly and cache-key coverage for style selection and style content changes.
- Style injection when a style is configured, including when no mode is active; no configured style preserves the current mode-unset bytes exactly.
- User-facing documentation and inspectability sufficient to identify the effective style and its source.
- Tests for config precedence, custom file safety, assembly order, cache stability/invalidation, and mode-unset compatibility.

Out of scope:

- Per-preset or per-mode style selection.
- Multiple simultaneously selected styles.
- Inline style prose inside JSON configuration.
- A style editor or other graphical configuration UI.
- Moving existing behavioral modifiers such as `playful` or `speak-plain` into the style catalog in this feature.

## Open questions for feature design

- Choose final config key names and define whether named-style maps merge by key across global/project scope or project scope replaces the global map wholesale.
- Define the safest useful custom-file policy, including containment, symlink handling, and whether global config may reference files outside its own directory.
- Place the style fragment relative to mode modifiers. A global baseline before modifiers would let task-specific modifiers specialize communication where necessary.
- Decide whether v1 is config-only or gains a `/style` inspection/selection command; avoid overloading the `/mode` command with an independent concern.
- Decide how `/mode:inspect` and the footer surface the effective style without implying it is part of the mode preset.
- Reconcile overlap with `speak-plain` and `playful` while preserving existing preset behavior.

## Dependencies

None. The feature extends the existing config, fragment-loading, prompt-assembly, and cache seams but does not require either active presentation feature to finish first.
