import type { LucideIcon } from 'lucide-react'

import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/**
 * Toolbar entry that groups several {@link MarkdownToolbarAction}s under a
 * single dropdown trigger.
 *
 * @remarks
 * Used to keep the toolbar compact when multiple related variants exist —
 * for example, paragraph + heading levels 2 through 6 collapse into a single
 * "Paragraph & headings" dropdown by default.
 */
export type MarkdownToolbarGroup = {
  /** Accessible name for the dropdown trigger button. */
  label: string
  /** Lucide icon rendered inside the dropdown trigger. */
  icon: LucideIcon
  /** Actions shown as items inside the dropdown menu. */
  items: MarkdownToolbarAction[]
}
