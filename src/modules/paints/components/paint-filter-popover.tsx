'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Reusable popover-with-checkbox-multiselect for the paint explorer filter bar.
 *
 * Renders a button trigger that shows the label, a selection badge count, and
 * a chevron. When opened, displays a scrollable list of options with per-option
 * paint counts. Visual language matches {@link PaintSimilarSection}.
 *
 * @param props.label - The button label shown on the trigger (e.g. "Brand").
 * @param props.options - The list of options to display.
 * @param props.counts - Record of option ID to paint count. Used to render a
 *   muted count next to each option name.
 * @param props.selectedIds - IDs of currently selected options.
 * @param props.onToggle - Called with the option ID when a checkbox changes.
 * @param props.emptyMessage - Text shown when `options` is empty.
 * @param props.disabled - When `true`, the trigger is muted and the popover
 *   cannot be opened.
 */
export function PaintFilterPopover({
  label,
  options,
  counts,
  selectedIds,
  onToggle,
  emptyMessage = 'No options.',
  disabled = false,
}: {
  label: string
  options: { id: string; name: string }[]
  counts: Record<string, number>
  selectedIds: string[]
  onToggle: (id: string) => void
  emptyMessage?: string
  disabled?: boolean
}) {
  const selectedCount = selectedIds.length

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'btn btn-outline btn-sm',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {label}
        {selectedCount > 0 && (
          <span className="badge badge-sm badge-primary ml-2">{selectedCount}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 max-h-64 overflow-auto p-2">
        {options.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {options.map((option) => {
              const checked = selectedIds.includes(option.id)
              const count = counts[option.id] ?? 0
              return (
                <li key={option.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(option.id)}
                    />
                    <span className="flex-1 capitalize">{option.name}</span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
