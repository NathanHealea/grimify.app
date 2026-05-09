import { Heading4 } from 'lucide-react'

import { heading4 } from '@/modules/markdown/actions/heading-4'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link heading4} transform. */
export const heading4ToolbarAction: MarkdownToolbarAction = {
  label: 'Heading 4',
  icon: Heading4,
  action: heading4,
}
