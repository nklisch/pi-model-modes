---
id: gate-cruft-filter-mode-wrapper
kind: story
stage: drafting
tags: [cleanup]
parent: null
depends_on: []
release_binding: null
gate_origin: cruft
created: 2026-07-12
updated: 2026-07-12
---

# Remove the filterModeArgItems passthrough wrapper

## Confidence
Medium

## Category
Passthrough wrapper

## Location
`src/autocomplete.ts:84`

## Evidence

```ts
export function filterModeArgItems(items, token) {
  return filterAutocompleteItems(items, token);
}
```

## Removal
Call `filterAutocompleteItems` directly at internal sites and remove the redundant wrapper-specific tests/imports while preserving the end-to-end suggestion matrix.
