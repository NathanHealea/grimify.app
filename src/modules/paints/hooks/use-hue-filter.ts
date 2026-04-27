'use client'

import { useCallback, useEffect, useState } from 'react'

import { getHueService } from '@/modules/hues/services/hue-service.client'
import { getPaintService } from '@/modules/paints/services/paint-service.client'
import type { Hue } from '@/types/color'

/**
 * Return value of {@link useHueFilter}.
 *
 * @param selectedParent - The currently selected top-level hue, or `null`.
 * @param selectedChild - The currently selected child hue, or `null`.
 * @param selectedParentId - UUID of the selected parent hue, or `null`.
 * @param selectedChildId - UUID of the selected child hue, or `null`.
 * @param childHues - Child hues loaded for the active parent, or `[]`.
 * @param childHuePaintCounts - Paint counts per child hue name (lowercased).
 * @param selectParent - Selects a parent hue by name; deselects if already selected.
 * @param selectChild - Selects a child hue by name; deselects if already selected.
 * @param clear - Clears all hue selections.
 */
export type HueFilterState = {
  selectedParent: Hue | null
  selectedChild: Hue | null
  selectedParentId: string | null
  selectedChildId: string | null
  childHues: Hue[]
  childHuePaintCounts: Record<string, number>
  selectParent: (name: string) => void
  selectChild: (name: string) => void
  clear: () => void
}

/**
 * Manages parent/child hue selection for the paint explorer filter bar.
 *
 * Fetches child hues and their paint counts when a parent is selected.
 * Requests are cancelled if the parent selection changes before they complete.
 *
 * Resolves hue names to IDs so callers can pass the derived IDs directly to
 * `searchPaintsUnified` without an extra lookup.
 *
 * @param options.hues - All top-level hues (server-fetched).
 * @param options.initialParentName - Parent hue name from URL hydration (lowercased).
 * @param options.initialChildName - Child hue name from URL hydration (lowercased).
 */
export function useHueFilter(options: {
  hues: Hue[]
  initialParentName?: string | null
  initialChildName?: string | null
}): HueFilterState {
  const { hues, initialParentName, initialChildName } = options

  const [selectedParentName, setSelectedParentName] = useState<string | null>(
    initialParentName ?? null
  )
  const [selectedChildName, setSelectedChildName] = useState<string | null>(
    initialChildName ?? null
  )
  const [childHues, setChildHues] = useState<Hue[]>([])
  const [childHuePaintCounts, setChildHuePaintCounts] = useState<Record<string, number>>({})

  const selectedParent = hues.find((h) => h.name.toLowerCase() === selectedParentName) ?? null
  const selectedChild =
    childHues.find((h) => h.name.toLowerCase() === selectedChildName) ?? null

  // Fetch child hues + paint counts when parent changes
  useEffect(() => {
    if (!selectedParent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChildHues([])
      setChildHuePaintCounts({})
      return
    }

    let cancelled = false

    async function fetchChildren() {
      const hueService = getHueService()
      const paintService = getPaintService()
      const children = await hueService.getChildHues(selectedParent!.id)

      if (cancelled) return
      setChildHues(children)

      const entries = await Promise.all(
        children.map(async (child) => {
          const count = await paintService.getPaintCountByHueId(child.id)
          return [child.name.toLowerCase(), count] as const
        })
      )

      if (cancelled) return
      setChildHuePaintCounts(Object.fromEntries(entries))
    }

    fetchChildren()
    return () => { cancelled = true }
  }, [selectedParent])

  const selectParent = useCallback((name: string) => {
    setSelectedParentName((prev) => {
      if (prev === name) {
        setSelectedChildName(null)
        return null
      }
      setSelectedChildName(null)
      return name
    })
  }, [])

  const selectChild = useCallback((name: string) => {
    setSelectedChildName((prev) => (prev === name ? null : name))
  }, [])

  const clear = useCallback(() => {
    setSelectedParentName(null)
    setSelectedChildName(null)
    setChildHues([])
    setChildHuePaintCounts({})
  }, [])

  return {
    selectedParent,
    selectedChild,
    selectedParentId: selectedParent?.id ?? null,
    selectedChildId: selectedChild?.id ?? null,
    childHues,
    childHuePaintCounts,
    selectParent,
    selectChild,
    clear,
  }
}
