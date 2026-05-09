import { Eraser } from 'lucide-react'

import { clearFormatting } from '@/modules/markdown/actions/clear-formatting'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'

/** Toolbar entry for the {@link clearFormatting} transform. */
export const clearFormattingToolbarAction: MarkdownToolbarAction = {
  label: 'Clear formatting',
  icon: Eraser,
  action: clearFormatting,
}
