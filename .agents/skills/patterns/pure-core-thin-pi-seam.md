# Pure core + thin pi registration seam

Split every pi-facing capability into a pure, dependency-free core (no
`ExtensionAPI` / `ExtensionContext` import) that takes plain inputs and returns
plain strings/objects, plus a tiny `registerX(pi)` wrapper that is the only code
allowed to touch the pi runtime. The pure half is unit-tested with synthetic
inputs; the wrapper only adapts pi to the pure API.

## Rationale

Pi types are environment-coupled and only constructable through the runtime.
Pushing them into render/parse logic forces tests to build full pi stubs just to
exercise a formatter. Keeping the logic pure makes byte-exact tests cheap and
keeps runtime seams narrow.

## Examples

### Render core + command registration

**Files**: `src/commands.ts:136`, `src/commands.ts:531`

```ts
export function renderModeInspect(
  snapshot: ChangeSignalSnapshot,
  model: Model<any> | undefined,
  mode: ResolvedMode | undefined,
  modeError?: string,
  assembledPrompt?: string,
): string { /* pure string assembly */ }

export function registerModeInspectCommand(pi: ExtensionAPI): void {
  pi.registerCommand(MODE_INSPECT_COMMAND, { handler: async (args, ctx) => { /* seam */ } });
}
```

### Footer formatter + UI seam

**Files**: `src/footer.ts:96`, `src/footer.ts:136`

```ts
export function formatModeFooter(inputs: ModeFooterInputs): string { /* pure */ }

export function refreshModeFooter(ctx: ExtensionContext): void {
  if (!ctx.hasUI) return;
  ctx.ui.setStatus(MODE_FOOTER_KEY, formatModeFooter({ /* gathered inputs */ }));
}
```

### Cycle math + shortcut seam

**Files**: `src/keybinding.ts:48`, `src/keybinding.ts:73`

```ts
export function nextPresetName(names: string[], current: string | undefined, dir: 1 | -1): string | undefined { /* pure */ }

export function registerModeKeybindings(pi: ExtensionAPI): void {
  pi.registerShortcut(CYCLE_FORWARD_KEY, { handler: cycle(1) });
}
```

## When to use

- New commands, shortcuts, autocomplete providers, event handlers, footer/status writers.
- Any string/structured value a test should pin byte-for-byte.

## When not to use

- One-line adapters with no behavior worth naming.
- Glue that is meaningful only as a pi side effect.

## Common violations

- Reading `ctx.model` or `ctx.ui` inside a formatter.
- Inlining render logic in a registered handler.
- Duplicating logic in the seam instead of calling the pure helper.
