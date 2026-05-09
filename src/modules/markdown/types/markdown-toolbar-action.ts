import type { LucideIcon } from 'lucide-react'

import type { MarkdownAction } from '@/modules/markdown/types/markdown-action'

/**
 * Keyboard shortcut metadata for a {@link MarkdownToolbarAction}.
 *
 * @remarks
 * The editor treats `key` as case-insensitive and always requires the platform
 * meta key (`Ctrl` on Windows/Linux, `Cmd` on macOS) — there is no separate
 * modifier flag because every shortcut in the markdown toolbar uses the meta
 * key today.
 */
export type MarkdownToolbarShortcut = {
  /** Single character (e.g. `'b'`) or named key (e.g. `'Enter'`). Compared case-insensitively. */
  key: string
}

/**
 * Toolbar entry that pairs a pure {@link MarkdownAction} transform with the
 * UI metadata needed to render a toolbar button: an accessible label, an
 * icon, and an optional keyboard shortcut.
 *
 * @remarks
 * The pure transform lives in `src/modules/markdown/actions/`; toolbar
 * wrappers live in `src/modules/markdown/toolbar-actions/`. Splitting the
 * concerns keeps the transforms unit-testable and the UI metadata co-located
 * with the icons.
 */
export type MarkdownToolbarAction = {
  /** Accessible name announced to screen readers and shown in dropdown items. */
  label: string
  /** Lucide icon rendered inside the button or dropdown item. */
  icon: LucideIcon
  /** Pure transform invoked when the user activates the button. */
  action: MarkdownAction
  /** Optional Ctrl/Cmd shortcut. See {@link MarkdownToolbarShortcut}. */
  shortcut?: MarkdownToolbarShortcut
}
