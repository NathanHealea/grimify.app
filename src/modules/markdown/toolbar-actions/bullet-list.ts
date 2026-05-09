import { List } from 'lucide-react'

import { bulletList } from '@/modules/markdown/actions/bullet-list'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link bulletList} transform. */
export const bulletListToolbarAction: MarkdownToolbarAction = {
  label: 'Bulleted list',
  icon: List,
  action: bulletList,
}
