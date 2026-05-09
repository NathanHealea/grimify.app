import { Heading6 } from 'lucide-react'

import { heading6 } from '@/modules/markdown/actions/heading-6'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link heading6} transform. */
export const heading6ToolbarAction: MarkdownToolbarAction = {
  label: 'Heading 6',
  icon: Heading6,
  action: heading6,
}
