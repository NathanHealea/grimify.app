'use client'

import { ChevronDown } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'
import type { MarkdownToolbarGroup } from '@/modules/markdown/types/markdown-toolbar-group'

/**
 * Props accepted by {@link MarkdownToolbarDropdown}.
 */
export type MarkdownToolbarDropdownProps = {
  /** The grouped actions to render. See {@link MarkdownToolbarGroup}. */
  group: MarkdownToolbarGroup
  /** When `true` the trigger is rendered in its disabled state. */
  disabled?: boolean
  /** Called with the selected action when the user picks a menu item. */
  onSelect: (action: MarkdownToolbarAction) => void
}

/**
 * Dropdown variant of the toolbar button — renders a trigger that opens a menu
 * listing each action in the group with its icon and label.
 *
 * @remarks
 * Used by {@link MarkdownEditor} to keep the toolbar compact when many related
 * variants exist (e.g. paragraph + heading levels). The trigger is `type="button"`
 * so it never submits the surrounding form.
 *
 * @param props - See {@link MarkdownToolbarDropdownProps}.
 */
export function MarkdownToolbarDropdown({
  group,
  disabled,
  onSelect,
}: MarkdownToolbarDropdownProps) {
  const TriggerIcon = group.icon
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={group.label}
        disabled={disabled}
        className="btn btn-ghost btn-sm"
      >
        <TriggerIcon className="h-4 w-4" />
        <ChevronDown className="ml-1 h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {group.items.map((item) => {
          const ItemIcon = item.icon
          return (
            <DropdownMenuItem
              key={item.label}
              onSelect={(event) => {
                event.preventDefault()
                onSelect(item)
              }}
            >
              <ItemIcon className="size-4" />
              {item.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
