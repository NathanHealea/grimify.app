import { Heading3 } from 'lucide-react'

import { heading3 } from '@/modules/markdown/actions/heading-3'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link heading3} transform. */
export const heading3ToolbarAction: MarkdownToolbarAction = {
  label: 'Heading 3',
  icon: Heading3,
  action: heading3,
}
