---
id: gate-security-style-read-toctou
kind: story
stage: drafting
tags: [security]
parent: null
depends_on: []
release_binding: v0.3.1
gate_origin: security
created: 2026-07-12
updated: 2026-07-12
---

# Close the residual custom-style read symlink race

## Severity
Low

## Domain
Input Validation & Injection / path containment

## Location
`src/style.ts:81`

## Evidence

```ts
targetReal = realpathSync(candidate);
if (!statSync(targetReal).isFile()) throw ...;
return targetReal;
```

The later fragment read resolves the returned path again. A same-user attacker
with write access inside the trusted config directory could theoretically swap
the validated file for an escaping symlink between check and read.

## Remediation direction

Read through a no-follow file descriptor, or revalidate identity at the actual
read boundary, while retaining per-turn containment checks and fragment caching.
