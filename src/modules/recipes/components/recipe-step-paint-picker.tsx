'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Palette } from '@/modules/palettes/types/palette'
import { usePaintSearch } from '@/modules/paints/hooks/use-paint-search'
import { addRecipeStepPaint } from '@/modules/recipes/actions/add-recipe-step-paint'
import { RecipeStepPaintModeTabs } from '@/modules/recipes/components/recipe-step-paint-mode-tabs'

const PAGE_SIZE = 24

type Mode = 'palette' | 'library'

/**
 * Modal paint picker for a recipe step.
 *
 * Defaults to **palette** mode when {@link Palette} is provided so the
 * recipe's linked palette is the first thing users see — selecting from
 * there records `paletteSlotId` so future swap-aware features can find the
 * link. A "All paints" tab swaps to a debounced library search reusing
 * {@link usePaintSearch}. When no palette is linked, the picker opens
 * directly into library mode and the tabs are hidden.
 *
 * Selecting a paint calls {@link addRecipeStepPaint}; on success the dialog
 * closes and the parent list re-renders via revalidation. Errors surface as
 * toasts and keep the dialog open.
 *
 * @param props.stepId - UUID of the step that should receive the new paint.
 * @param props.palette - The recipe's linked palette, or `null` when none.
 */
export function RecipeStepPaintPicker({
  stepId,
  palette,
}: {
  stepId: string
  palette: Palette | null
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>(palette ? 'palette' : 'library')
  const [paletteFilter, setPaletteFilter] = useState('')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [isAdding, startAdd] = useTransition()

  const filteredPaletteSlots = useMemo(() => {
    if (!palette) return []
    const q = paletteFilter.trim().toLowerCase()
    if (!q) return palette.paints
    return palette.paints.filter((slot) => {
      const data = slot.paint
      if (!data) return false
      return (
        data.name.toLowerCase().includes(q) ||
        (data.brand_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [palette, paletteFilter])

  const {
    paints: librarySearchResults,
    isLoading: libraryLoading,
    error: libraryError,
  } = usePaintSearch({
    query: libraryQuery,
    pageSize: PAGE_SIZE,
    page: 1,
  })

  function reset() {
    setPaletteFilter('')
    setLibraryQuery('')
    setMode(palette ? 'palette' : 'library')
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  function selectPaint(paintId: string, paintName: string, paletteSlotId: string | null) {
    startAdd(async () => {
      const result = await addRecipeStepPaint(stepId, {
        paintId,
        paletteSlotId,
      })
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(`Added '${paintName}' to step`)
      handleOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="btn btn-sm btn-ghost text-xs gap-1"
          aria-label="Add paint to step"
        >
          <Plus className="size-3.5" aria-hidden />
          Add paint
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add paint</DialogTitle>
          <DialogDescription>
            {palette
              ? `Pick from "${palette.name}" or search the full library.`
              : 'Search the full paint library.'}
          </DialogDescription>
        </DialogHeader>

        {palette && (
          <RecipeStepPaintModeTabs value={mode} onChange={setMode} />
        )}

        {mode === 'palette' && palette ? (
          <div className="flex flex-col gap-3 overflow-hidden">
            <Input
              type="search"
              value={paletteFilter}
              onChange={(e) => setPaletteFilter(e.target.value)}
              placeholder={`Filter ${palette.name}…`}
            />
            <div className="overflow-y-auto pr-1">
              {filteredPaletteSlots.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {palette.paints.length === 0
                    ? 'This palette is empty.'
                    : 'No matches in this palette.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredPaletteSlots.map((slot) =>
                    slot.paint ? (
                      <button
                        key={`${slot.position}-${slot.paintId}`}
                        type="button"
                        disabled={isAdding}
                        onClick={() =>
                          selectPaint(slot.paintId, slot.paint!.name, slot.paintId)
                        }
                        className="flex items-center gap-3 rounded-lg border border-border p-2 text-left hover:bg-muted disabled:opacity-60"
                      >
                        <div
                          className="size-8 shrink-0 rounded-sm"
                          style={{ backgroundColor: slot.paint.hex }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {slot.paint.name}
                          </p>
                          {slot.paint.brand_name && (
                            <p className="truncate text-xs text-muted-foreground">
                              {[slot.paint.brand_name, slot.paint.product_line_name]
                                .filter(Boolean)
                                .join(': ')}
                            </p>
                          )}
                        </div>
                      </button>
                    ) : null,
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-hidden">
            <Input
              type="search"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Search paints by name…"
            />
            <div className="overflow-y-auto pr-1">
              {libraryError ? (
                <p className="p-4 text-center text-sm text-destructive">
                  {libraryError}
                </p>
              ) : libraryLoading && librarySearchResults.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Searching…
                </p>
              ) : librarySearchResults.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {libraryQuery
                    ? 'No paints match that search.'
                    : 'Type to search.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {librarySearchResults.map((paint) => (
                    <button
                      key={paint.id}
                      type="button"
                      disabled={isAdding}
                      onClick={() => selectPaint(paint.id, paint.name, null)}
                      className="flex items-center gap-3 rounded-lg border border-border p-2 text-left hover:bg-muted disabled:opacity-60"
                    >
                      <div
                        className="size-8 shrink-0 rounded-sm"
                        style={{ backgroundColor: paint.hex }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{paint.name}</p>
                        {paint.product_lines?.brands?.name && (
                          <p className="truncate text-xs text-muted-foreground">
                            {paint.product_lines.brands.name}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
