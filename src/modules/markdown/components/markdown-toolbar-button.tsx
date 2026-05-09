'use client'

import type { LucideIcon } from 'lucide-react'

/**
 * Props accepted by {@link MarkdownToolbarButton}.
 */
export type MarkdownToolbarButtonProps = {
  /** Accessible name announced to screen readers. */
  label: string
  /** Lucide icon rendered inside the button. */
  icon: LucideIcon
  /** When `true` the button is rendered in its disabled state. */
  disabled?: boolean
  /** Click handler — typically dispatches a markdown action against the textarea. */
  onClick: () => void
}

/**
 * Square icon button used by the markdown editor toolbar.
 *
 * @remarks
 * Always renders as `type="button"` so it never accidentally submits the
 * parent form. Styling matches the daisyUI ghost-square pattern shared by
 * every formatting action.
 *
 * @param props - See {@link MarkdownToolbarButtonProps}.
 */
export function MarkdownToolbarButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: MarkdownToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="btn btn-ghost btn-sm btn-square"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
