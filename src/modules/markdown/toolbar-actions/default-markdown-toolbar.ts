import { Heading } from 'lucide-react'

import { boldToolbarAction } from '@/modules/markdown/toolbar-actions/bold'
import { bulletListToolbarAction } from '@/modules/markdown/toolbar-actions/bullet-list'
import { heading2ToolbarAction } from '@/modules/markdown/toolbar-actions/heading-2'
import { heading3ToolbarAction } from '@/modules/markdown/toolbar-actions/heading-3'
import { heading4ToolbarAction } from '@/modules/markdown/toolbar-actions/heading-4'
import { heading5ToolbarAction } from '@/modules/markdown/toolbar-actions/heading-5'
import { heading6ToolbarAction } from '@/modules/markdown/toolbar-actions/heading-6'
import { inlineCodeToolbarAction } from '@/modules/markdown/toolbar-actions/inline-code'
import { italicToolbarAction } from '@/modules/markdown/toolbar-actions/italic'
import { numberedListToolbarAction } from '@/modules/markdown/toolbar-actions/numbered-list'
import { paragraphToolbarAction } from '@/modules/markdown/toolbar-actions/paragraph'
import type { MarkdownToolbarItem } from '@/modules/markdown/types/markdown-toolbar-item'

/**
 * Default toolbar layout used by {@link MarkdownEditor} when no custom
 * `toolbar` prop is supplied.
 *
 * @remarks
 * Bold, italic, and inline code are exposed as standalone buttons. Paragraph
 * + heading levels 2 through 6 collapse into a single "Paragraph & headings"
 * dropdown to keep the toolbar compact. Bullet and numbered lists round out
 * the trailing standalone buttons.
 */
export const defaultMarkdownToolbar: MarkdownToolbarItem[] = [
  boldToolbarAction,
  italicToolbarAction,
  inlineCodeToolbarAction,
  {
    label: 'Paragraph & headings',
    icon: Heading,
    items: [
      paragraphToolbarAction,
      heading2ToolbarAction,
      heading3ToolbarAction,
      heading4ToolbarAction,
      heading5ToolbarAction,
      heading6ToolbarAction,
    ],
  },
  bulletListToolbarAction,
  numberedListToolbarAction,
]
