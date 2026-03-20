'use client'

import { useMemo, useState } from 'react'

import { brands } from '@/data/index'
import { useCollectionStore } from '@/stores/useCollectionStore'
import { useFilterStore } from '@/stores/useFilterStore'
import { usePaintStore } from '@/stores/usePaintStore'
import { useUIStore } from '@/stores/useUIStore'
import type { PaintGroup, ProcessedPaint } from '@/types/paint'
import { comparePaintGroups } from '@/utils/colorUtils'
import { isGroupDimmed, isGroupSchemeDimmed, type GroupFilterParams } from '@/utils/filterUtils'

interface ListViewProps {
  paintGroups: PaintGroup[]
  searchMatchIds: Set<string>
  isSchemeMatching: (paint: ProcessedPaint) => boolean
}

export default function ListView({ paintGroups, searchMatchIds, isSchemeMatching }: ListViewProps) {
  const selectedGroup = usePaintStore((s) => s.selectedGroup)
  const selectGroup = usePaintStore((s) => s.selectGroup)
  const setHoveredGroup = usePaintStore((s) => s.setHoveredGroup)
  const selectedPaint = usePaintStore((s) => s.selectedPaint)
  const brandFilter = useFilterStore((s) => s.brandFilter)
  const colorScheme = useFilterStore((s) => s.colorScheme)
  const ownedFilter = useFilterStore((s) => s.ownedFilter)
  const showBrandRing = useUIStore((s) => s.showBrandRing)
  const showOwnedRing = useUIStore((s) => s.showOwnedRing)
  const ownedIds = useCollectionStore((s) => s.ownedIds)

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const sorted = useMemo(() => [...paintGroups].sort(comparePaintGroups), [paintGroups])

  const toggleExpanded = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto" role="listbox">
      {sorted.map((group) => {
        const filterParams: GroupFilterParams = {
          brandFilter,
          searchMatchIds,
          isSchemeActive: colorScheme !== 'none' && selectedPaint !== null,
          isSchemeMatching,
          ownedFilter,
          ownedIds,
        }
        const dimmed = isGroupDimmed(group, filterParams)
        const schemeDimmed = isGroupSchemeDimmed(group, isSchemeMatching)
        const hasActiveScheme = filterParams.isSchemeActive
        const isSelected = selectedGroup?.key === group.key
        const isMulti = group.paints.length > 1
        const isOwned = group.paints.some((p) => ownedIds.has(p.id))
        const isExpanded = expandedGroups.has(group.key)
        const isSearchMatch = searchMatchIds.size > 0 && group.paints.some((p) => searchMatchIds.has(p.id))

        const opacity = dimmed ? (schemeDimmed && hasActiveScheme ? 0.06 : 0.15) : 1

        if (isMulti) {
          return (
            <div key={group.key} style={{ opacity }}>
              {/* Summary row for multi-paint group */}
              <button
                className={`flex min-h-12 w-full cursor-pointer items-center gap-3 border-b border-base-300 px-3 py-2 transition-colors hover:bg-base-200 ${
                  isSelected ? 'bg-base-300 ring-1 ring-inset ring-primary' : ''
                } ${isSearchMatch && !dimmed ? 'bg-primary/10' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  toggleExpanded(group.key)
                  selectGroup(group)
                }}
                onPointerEnter={() => setHoveredGroup(group)}
                onPointerLeave={() => setHoveredGroup(null)}>
                {/* Color swatch */}
                <div
                  className="h-10 w-10 shrink-0 rounded md:h-10 md:w-10"
                  style={{ backgroundColor: group.rep.hex }}
                />

                {/* Center info */}
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate font-medium">
                    {group.paints.length} paints
                    <span className="ml-2 text-xs text-base-content/40">
                      {isExpanded ? '▾' : '▸'}
                    </span>
                  </div>
                  <div className="truncate text-sm text-base-content/60">
                    {group.paints.map((p) => p.name).join(', ')}
                  </div>
                </div>

                {/* Right side */}
                <div className="hidden shrink-0 items-center gap-2 text-right md:flex">
                  <span className="font-mono text-sm text-base-content/40">{group.rep.hex.toUpperCase()}</span>
                  {showOwnedRing && isOwned && !dimmed && (
                    <span className="text-xs text-emerald-400">✓</span>
                  )}
                </div>
              </button>

              {/* Expanded sub-rows */}
              {isExpanded &&
                group.paints.map((paint) => {
                  const brand = brands.find((b) => b.id === paint.brand)
                  const isPaintOwned = ownedIds.has(paint.id)
                  const isPaintSearchMatch = searchMatchIds.size > 0 && searchMatchIds.has(paint.id)

                  return (
                    <button
                      key={paint.id}
                      className={`flex min-h-12 w-full cursor-pointer items-center gap-3 border-b border-base-300 py-2 pr-3 pl-7 transition-colors hover:bg-base-200 ${
                        selectedPaint?.id === paint.id ? 'bg-base-300 ring-1 ring-inset ring-primary' : ''
                      } ${isPaintSearchMatch && !dimmed ? 'bg-primary/10' : ''}`}
                      role="option"
                      aria-selected={selectedPaint?.id === paint.id}
                      onClick={() => usePaintStore.getState().selectPaint(paint, group)}
                      onPointerEnter={() => setHoveredGroup(group)}
                      onPointerLeave={() => setHoveredGroup(null)}>
                      {/* Smaller swatch */}
                      <div
                        className="h-8 w-8 shrink-0 rounded"
                        style={{ backgroundColor: paint.hex }}
                      />

                      {/* Paint info */}
                      <div className="min-w-0 flex-1 text-left">
                        <div className="truncate font-medium">{paint.name}</div>
                        <div className="flex items-center gap-1 text-sm text-base-content/60">
                          {brand && (
                            <>
                              <span>{brand.icon}</span>
                              <span className="hidden md:inline">{brand.name}</span>
                            </>
                          )}
                          <span className="hidden md:inline">· {paint.type}</span>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="hidden shrink-0 items-center gap-2 text-right md:flex">
                        <span className="font-mono text-sm text-base-content/40">
                          {paint.hex.toUpperCase()}
                        </span>
                        {showBrandRing && brand && (
                          <span
                            className="block h-2 w-2 rounded-full"
                            style={{ backgroundColor: brand.color }}
                          />
                        )}
                        {showOwnedRing && isPaintOwned && !dimmed && (
                          <span className="text-xs text-emerald-400">✓</span>
                        )}
                      </div>
                    </button>
                  )
                })}
            </div>
          )
        }

        // Single-paint row
        const paint = group.rep
        const brand = brands.find((b) => b.id === paint.brand)

        return (
          <button
            key={group.key}
            className={`flex min-h-12 w-full cursor-pointer items-center gap-3 border-b border-base-300 px-3 py-2 transition-colors hover:bg-base-200 ${
              isSelected ? 'bg-base-300 ring-1 ring-inset ring-primary' : ''
            } ${isSearchMatch && !dimmed ? 'bg-primary/10' : ''}`}
            role="option"
            aria-selected={isSelected}
            style={{ opacity }}
            onClick={() => selectGroup(group)}
            onPointerEnter={() => setHoveredGroup(group)}
            onPointerLeave={() => setHoveredGroup(null)}>
            {/* Color swatch */}
            <div
              className="h-10 w-10 shrink-0 rounded md:h-10 md:w-10"
              style={{ backgroundColor: paint.hex }}
            />

            {/* Center info */}
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate font-medium">{paint.name}</div>
              <div className="flex items-center gap-1 text-sm text-base-content/60">
                {brand && (
                  <>
                    <span>{brand.icon}</span>
                    <span className="hidden md:inline">{brand.name}</span>
                  </>
                )}
                <span className="hidden md:inline">· {paint.type}</span>
              </div>
            </div>

            {/* Right side */}
            <div className="hidden shrink-0 items-center gap-2 text-right md:flex">
              <span className="font-mono text-sm text-base-content/40">{paint.hex.toUpperCase()}</span>
              {showBrandRing && brand && (
                <span
                  className="block h-2 w-2 rounded-full"
                  style={{ backgroundColor: brand.color }}
                />
              )}
              {showOwnedRing && isOwned && !dimmed && (
                <span className="text-xs text-emerald-400">✓</span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
