import { create } from 'zustand'

import type { PaintGroup, ProcessedPaint, ViewMode } from '@/types/paint'

import { useFilterStore } from './useFilterStore'

interface PaintState {
  selectedGroup: PaintGroup | null
  selectedPaint: ProcessedPaint | null
  hoveredGroup: PaintGroup | null
  viewMode: ViewMode
  paintToRemove: ProcessedPaint | null

  setHoveredGroup: (group: PaintGroup | null) => void
  selectGroup: (group: PaintGroup | null) => void
  selectPaint: (paint: ProcessedPaint, group: PaintGroup) => void
  selectSearchResult: (paint: ProcessedPaint, paintGroups: PaintGroup[]) => void
  setViewMode: (mode: ViewMode) => void
  setPaintToRemove: (paint: ProcessedPaint | null) => void
  clearSelection: () => void
}

export const usePaintStore = create<PaintState>()((set, get) => ({
  selectedGroup: null,
  selectedPaint: null,
  hoveredGroup: null,
  viewMode: 'wheel',
  paintToRemove: null,

  setHoveredGroup: (group) => set({ hoveredGroup: group }),

  selectGroup: (group) => {
    const state = get()
    if (!group) {
      set({ selectedGroup: null, selectedPaint: null })
      useFilterStore.getState().setColorScheme('none')
      return
    }
    if (state.selectedGroup?.key === group.key) {
      set({ selectedGroup: null, selectedPaint: null })
      useFilterStore.getState().setColorScheme('none')
    } else if (group.paints.length === 1) {
      set({ selectedGroup: group, selectedPaint: group.rep })
    } else {
      set({ selectedGroup: group, selectedPaint: null })
    }
  },

  selectPaint: (paint, group) => set({ selectedGroup: group, selectedPaint: paint }),

  selectSearchResult: (paint, paintGroups) => {
    const group = paintGroups.find((g) => g.paints.some((p) => p.id === paint.id))
    if (group) {
      set({ selectedGroup: group, selectedPaint: paint })
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setPaintToRemove: (paint) => set({ paintToRemove: paint }),

  clearSelection: () => {
    set({ selectedGroup: null, selectedPaint: null })
    useFilterStore.getState().setColorScheme('none')
  },
}))
