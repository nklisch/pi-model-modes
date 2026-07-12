---
id: gate-security-project-style-visibility
kind: story
stage: drafting
tags: [security]
parent: null
depends_on: []
release_binding: null
gate_origin: security
created: 2026-07-12
updated: 2026-07-12
---

# Surface project-configured custom style activation

## Severity
Low

## Domain
Extension API / prompt injection boundary

## Location
`src/config.ts:166`

## Evidence

```ts
const selection = scopes.project.writingStyle ?? scopes.global.writingStyle;
configureStyleDefaults({ selection: validSelection, source, registry });
```

A trusted project can activate custom prose that is injected into the system
prompt without a passive style indicator. This does not create a stronger trust
boundary than project `AGENTS.md` or skills, but the new surface is less visible.

## Remediation direction

Provide a one-time informational notification or another passive indication when
a project custom style becomes effective. Do not add a redundant trust prompt
unless Pi's project-trust contract cannot cover this resource.
