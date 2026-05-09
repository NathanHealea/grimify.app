import { Bold } from 'lucide-react'

import { bold } from '@/modules/markdown/actions/bold'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link bold} transform — bound to `Ctrl/Cmd+B`. */
export const boldToolbarAction: MarkdownToolbarAction = {
  label: 'Bold',
  icon: Bold,
  action: bold,
  shortcut: { key: 'b' },
}
