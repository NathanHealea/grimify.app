import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/modules/markdown/components/markdown-renderer'
import type { RecipeNote } from '@/modules/recipes/types/recipe-note'

/**
 * Read-only render for a recipe's notes on the public detail view.
 *
 * Renders nothing when `notes` is empty so callers can mount the
 * component unconditionally. Each note becomes its own callout block
 * with a left primary border accent (`border-l-4 border-primary`) so
 * notes are visually distinct from step instructions and the recipe
 * summary. Markdown is rendered through {@link MarkdownRenderer},
 * which already enforces a safe element allow-list.
 *
 * @param props.notes - Notes ordered by `position`, head first.
 * @param props.className - Optional class for the wrapping `<div>`.
 * @param props.compact - When true (typically inside a step), uses a
 *   tighter text size and padding.
 */
export function RecipeNoteDisplay({
  notes,
  className,
  compact = false,
}: {
  notes: RecipeNote[]
  className?: string
  compact?: boolean
}) {
  if (notes.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {notes.map((note) => (
        <div
          key={note.id}
          className={cn(
            'rounded-md border border-border border-l-4 border-l-primary bg-base-200/40',
            compact ? 'px-3 py-2' : 'px-4 py-3',
          )}
        >
          <MarkdownRenderer
            content={note.body}
            className={compact ? 'text-sm' : ''}
          />
        </div>
      ))}
    </div>
  )
}
