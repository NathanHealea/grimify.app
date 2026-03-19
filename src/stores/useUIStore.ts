import { create } from 'zustand'

import type { SidebarTab } from '@/types/paint'

type SidebarState = SidebarTab | 'closed' | null

interface UIState {
  sidebarState: SidebarState
  lastTab: SidebarTab
  showBrandRing: boolean
  showOwnedRing: boolean
  zoom: number
  pan: { x: number; y: number }

  toggleTab: (tab: SidebarTab, isDesktop: boolean) => void
  toggleMenu: (isDesktop: boolean) => void
  closeSidebar: () => void
  toggleBrandRing: () => void
  toggleOwnedRing: () => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  resetView: () => void
}

function getEffectiveTab(sidebarState: SidebarState, isDesktop: boolean): SidebarTab | null {
  if (sidebarState === null) return isDesktop ? 'filters' : null
  if (sidebarState === 'closed') return null
  return sidebarState
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarState: null,
  lastTab: 'filters',
  showBrandRing: false,
  showOwnedRing: false,
  zoom: 1,
  pan: { x: 0, y: 0 },

  toggleTab: (tab, isDesktop) =>
    set((state) => {
      const current = getEffectiveTab(state.sidebarState, isDesktop)
      if (current === tab) return { sidebarState: 'closed' }
      return { sidebarState: tab, lastTab: tab }
    }),

  toggleMenu: (isDesktop) =>
    set((state) => {
      const current = getEffectiveTab(state.sidebarState, isDesktop)
      if (current !== null) return { sidebarState: 'closed' }
      return { sidebarState: state.lastTab }
    }),

  closeSidebar: () => set({ sidebarState: 'closed' }),

  toggleBrandRing: () => set((state) => ({ showBrandRing: !state.showBrandRing })),

  toggleOwnedRing: () => set((state) => ({ showOwnedRing: !state.showOwnedRing })),

  setZoom: (zoom) => set({ zoom }),

  setPan: (pan) => set({ pan }),

  resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
}))

/** Compute the effective tab accounting for desktop vs mobile and sidebar state */
export function getEffectiveTabFromState(sidebarState: SidebarState, isDesktop: boolean): SidebarTab | null {
  return getEffectiveTab(sidebarState, isDesktop)
}
