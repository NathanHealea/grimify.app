import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'
import type { MarkdownToolbarGroup } from '@/modules/markdown/types/markdown-toolbar-group'

/**
 * Discriminated union of toolbar entries accepted by the markdown editor.
 *
 * @remarks
 * - {@link MarkdownToolbarAction} — single button that runs one transform.
 * - {@link MarkdownToolbarGroup} — dropdown trigger that collects multiple
 *   actions under one button.
 *
 * Consumers can pass an array of these to the editor's `toolbar` prop, mixing
 * standalone actions with grouped dropdowns in any order.
 */
export type MarkdownToolbarItem = MarkdownToolbarAction | MarkdownToolbarGroup
