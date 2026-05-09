import { Italic } from 'lucide-react'

import { italic } from '@/modules/markdown/actions/italic'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link italic} transform — bound to `Ctrl/Cmd+I`. */
export const italicToolbarAction: MarkdownToolbarAction = {
  label: 'Italic',
  icon: Italic,
  action: italic,
  shortcut: { key: 'i' },
}
