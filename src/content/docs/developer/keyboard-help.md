---
title: Keyboard help (Alt)
description: Alt-toggle KeyTips on each control—no central shortcut panel.
section: connect
order: 3
---

# Keyboard help (Alt)

Press **Alt** (release, not in a text field) to toggle **help mode**. While help is on:

- Each actionable control shows a **small Wash KeyTip** (`WashShortcutBadge`) on the control—like Microsoft Word ribbon hints.
- **Letter / digit shortcuts** run (help mode only).
- **Esc** closes help and clears in-progress sequences.

There is **no** full-screen or corner panel listing every shortcut.

Excluded routes: `/kiosk/*`, `/display/*`, `/t/*`.

**Ctrl+K** / **Cmd+K** command search in the business console works even when help is off.

## Components

| Component | Use |
|-----------|-----|
| `ShortcutTarget` | Nav buttons, toolbar actions — pass `keys={['O']}` |
| `WashActionKbd` | Table row icon buttons — pass `key="e"` |
| `WashShortcutBadge` | Manual placement on a `relative` wrapper |

Styling: `.menzies-kbd-help__cap` (neutral chip, top-right of control).

## Page shortcuts

```ts
import { registerPageShortcuts } from '#lib/keyboard/registerPageShortcuts';

$effect(() => {
  const off = registerPageShortcuts([
    { id: 'my.save', scope: 'page', keys: ['S'], label: 'Save', run: () => save() }
  ]);
  return off;
});
```

## Data tables

```svelte
<DataTableShell keyboardRows={pageRows} rowActions={tableRowActions} bind:keyboardRowIndex ...>
```

- Row `<tr>`: `data-kbd-row-id`, `data-kbd-row-slot={String(i + 1)}`, optional `data-kbd-row-focus`.
- Wrap edit/delete/etc. with `WashActionKbd key="e"` / `key="d"`.
- Chord: row digit, then action key within 1.2s.

Implementation: `src/lib/keyboard/`, UI in `src/lib/component/own/local/keyboard/`.

## Key map (help mode)

| Scope | Key | Action |
|-------|-----|--------|
| Business shell | O | Business overview (home) |
| Business shell | S | Page search (Ctrl/Cmd+K always) |
| Data table header | R | Refresh list |
| Data table header | N | New / create / issue ticket / pair device |
| Table row chord | 1–9, 0 | Pick visible row, then action key within 1.2s |
| CRUD rows | e | Edit |
| CRUD rows | d | Delete / remove |
| CRUD rows | v | View / open / toggle / steps / provision |
| CRUD rows | x | Cancel invite / appointment |
| Agent desk rows | c | Call |
| Agent desk rows | s | Serve |
| Agent desk rows | h | Hold |
| Agent desk rows | f | Complete (Done) |

Per-page `tableId` prefixes page shortcuts (e.g. `admin-config.refresh`).

### Pages with row actions only on refresh (no row chords)

Queues and audit logs tables have no row action buttons; only **R** (and **N** on queues create if present).

### Excluded surfaces

`/kiosk/*`, `/display/*`, `/t/*` guest ticket URLs, marketing pages, auth forms, dialog text fields, and icon-only secondary actions without a registered chord (e.g. resend invite, suspend business) show no KeyTip unless listed in `rowActions`.
