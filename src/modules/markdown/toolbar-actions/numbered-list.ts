import { ListOrdered } from 'lucide-react'

import { numberedList } from '@/modules/markdown/actions/numbered-list'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link numberedList} transform. */
export const numberedListToolbarAction: MarkdownToolbarAction = {
  label: 'Numbered list',
  icon: ListOrdered,
  action: numberedList,
}
