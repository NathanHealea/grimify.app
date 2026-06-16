'use client'

import { useActionState, useCallback, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { addPaintsToHue } from '@/modules/admin/actions/hue-actions'
import { searchUnassignedPaints } from '@/modules/admin/actions/search-unassigned-paints'
import { useAdminPaintSearch } from '@/modules/admin/hooks/use-admin-paint-search'
import type { PaintHueActionState } from '@/modules/admin/types/paint-hue-action-state'
import { useDebouncedQuery } from '@/modules/paints/hooks/use-debounced-query'

const PAGE_SIZE = 20

/** Submit button that reflects the pending state of the enclosing form. */
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="btn-primary btn-sm">
      {pending ? 'Adding…' : 'Add Selected to Hue'}
    </Button>
  )
}

/**
 * Props for {@link AddPaintsToHue}.
 */
type AddPaintsToHueProps = {
  /** UUID of the hue to assign selected paints to. */
  hueId: string
}

/**
 * Client component that lets admins search for unassigned paints and add them to a hue.
 *
 * Renders a debounced search input over paints with no hue assignment, a
 * checkbox list of results (swatch, name, brand), and an "Add Selected to Hue"
 * submit button. Uses {@link addPaintsToHue} to persist assignments.
 *
 * @param props - {@link AddPaintsToHueProps}
 */
export function AddPaintsToHue({ hueId }: AddPaintsToHueProps) {
  const [inputValue, setInputValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)
  const [state, formAction] = useActionState<PaintHueActionState, FormData>(addPaintsToHue, null)

  const debouncedQuery = useDebouncedQuery(inputValue, { delay: 250, minChars: 1 })

  // Stable ref required by useAdminPaintSearch to avoid re-triggering the effect on every render.
  const stableServerAction = useCallback(
    (options: { query?: string; hueIds?: string[]; limit: number; offset: number }) =>
      searchUnassignedPaints(options),
    []
  )

  const { paints, isLoading } = useAdminPaintSearch({
    serverAction: stableServerAction,
    query: debouncedQuery || undefined,
    pageSize: PAGE_SIZE,
    page: 1,
    refreshKey,
  })

  // After a successful add, clear selection and re-fetch the unassigned list.
  useEffect(() => {
    if (state?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIds(new Set())
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRefreshKey((k) => k + 1)
    }
  }, [state])

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Search unassigned paints…"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="input input-sm w-full max-w-sm"
        aria-label="Search unassigned paints"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && paints.length > 0 && (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="hue_id" value={hueId} />
          <input type="hidden" name="paint_ids" value={Array.from(selectedIds).join(',')} />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-3 w-8" />
                  <th className="pb-2 pr-3 w-8">Color</th>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 font-medium">Brand</th>
                </tr>
              </thead>
              <tbody>
                {paints.map((paint) => (
                  <tr key={paint.id} className="border-b border-border/50">
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(paint.id)}
                        onChange={() => toggleOne(paint.id)}
                        className="checkbox checkbox-sm"
                        aria-label={`Select ${paint.name}`}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className="inline-block h-5 w-5 rounded border border-border"
                        style={{ backgroundColor: paint.hex }}
                        aria-hidden="true"
                      />
                    </td>
                    <td className="py-2 pr-4 font-medium">{paint.name}</td>
                    <td className="py-2 text-muted-foreground">
                      {paint.product_lines?.brands?.name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <SubmitButton />
            {selectedIds.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
            )}
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-green-600">
              Added {state.removed_count} paint{state.removed_count !== 1 ? 's' : ''} to hue.
            </p>
          )}
        </form>
      )}

      {!isLoading && paints.length === 0 && debouncedQuery && (
        <p className="text-sm text-muted-foreground">
          No unassigned paints match &quot;{debouncedQuery}&quot;.
        </p>
      )}

      {!isLoading && paints.length === 0 && !debouncedQuery && (
        <p className="text-sm text-muted-foreground">
          Search for paints to assign to this hue.
        </p>
      )}
    </div>
  )
}
