import { Heading2 } from 'lucide-react'

import { heading2 } from '@/modules/markdown/actions/heading-2'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link heading2} transform. */
export const heading2ToolbarAction: MarkdownToolbarAction = {
  label: 'Heading 2',
  icon: Heading2,
  action: heading2,
}
