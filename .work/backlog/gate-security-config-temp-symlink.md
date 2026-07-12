---
id: gate-security-config-temp-symlink
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

# Harden atomic config writes against pre-placed temp symlinks

## Severity
Low

## Domain
Secrets & Configuration / filesystem writes

## Location
`src/config.ts:453`

## Evidence

```ts
const tmpPath = `${path}.tmp`;
writeFileSync(tmpPath, `${JSON.stringify(next, null, 2)}\n`);
renameSync(tmpPath, path);
```

The fixed temp path can follow a pre-placed symlink when another local principal
can write the config directory, redirecting the config payload to another file.

## Remediation direction

Create a unique same-filesystem temporary path with exclusive/no-follow
semantics and restrictive permissions, then atomically rename it. Preserve
clear-when-absent and best-effort cleanup behavior.
