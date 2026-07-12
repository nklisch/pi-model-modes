---
id: gate-cruft-no-style-signature-reexport
kind: story
stage: implementing
tags: [cleanup]
parent: null
depends_on: []
release_binding: v0.3.0
gate_origin: cruft
created: 2026-07-12
updated: 2026-07-12
---

# Remove the unused NO_STYLE_SIGNATURE re-export

## Confidence
Medium

## Category
Unused re-export

## Location
`src/cache.ts:4`

## Evidence
```ts
import { NO_STYLE_SIGNATURE } from "./style.js";
export { NO_STYLE_SIGNATURE } from "./style.js";
```

The import is used internally, but no source, test, or extension imports the re-export from `cache.ts`.

## Removal
Delete only the re-export. Keep the local import used by cache component normalization.
