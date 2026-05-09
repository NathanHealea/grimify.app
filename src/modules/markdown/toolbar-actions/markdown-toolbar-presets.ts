import { defaultMarkdownToolbar } from '@/modules/markdown/toolbar-actions/default-markdown-toolbar'
import type { MarkdownToolbarItem } from '@/modules/markdown/types/markdown-toolbar-item'

/**
 * Registry of named toolbar layouts accepted by {@link MarkdownEditor}'s
 * `toolbar` prop.
 *
 * @remarks
 * Consumers can pass either a preset name (string) for a curated layout, or
 * a fully custom `MarkdownToolbarItem[]` array.
 */
export const markdownToolbarPresets = {
  default: defaultMarkdownToolbar,
} as const satisfies Record<string, MarkdownToolbarItem[]>

/**
 * Name of a registered toolbar preset. See {@link markdownToolbarPresets}.
 */
export type MarkdownToolbarPreset = keyof typeof markdownToolbarPresets
