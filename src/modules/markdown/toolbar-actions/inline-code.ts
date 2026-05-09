import { Code } from 'lucide-react'

import { inlineCode } from '@/modules/markdown/actions/inline-code'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link inlineCode} transform. */
export const inlineCodeToolbarAction: MarkdownToolbarAction = {
  label: 'Inline code',
  icon: Code,
  action: inlineCode,
}
