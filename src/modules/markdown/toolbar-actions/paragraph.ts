import { Pilcrow } from 'lucide-react'

import { paragraph } from '@/modules/markdown/actions/paragraph'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link paragraph} transform — strips heading markers. */
export const paragraphToolbarAction: MarkdownToolbarAction = {
  label: 'Paragraph',
  icon: Pilcrow,
  action: paragraph,
}
