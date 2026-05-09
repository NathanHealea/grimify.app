import { Heading5 } from 'lucide-react'

import { heading5 } from '@/modules/markdown/actions/heading-5'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link heading5} transform. */
export const heading5ToolbarAction: MarkdownToolbarAction = {
  label: 'Heading 5',
  icon: Heading5,
  action: heading5,
}
