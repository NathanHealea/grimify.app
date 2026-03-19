import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CollectionState {
  ownedIds: Set<string>
  toggleOwned: (paintId: string) => void
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set) => ({
      ownedIds: new Set<string>(),
      toggleOwned: (paintId) =>
        set((state) => {
          const next = new Set(state.ownedIds)
          if (next.has(paintId)) next.delete(paintId)
          else next.add(paintId)
          return { ownedIds: next }
        }),
    }),
    {
      name: 'colorwheel-owned-paints',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          try {
            const parsed = JSON.parse(str)
            // Handle legacy format: raw array stored by old useOwnedPaints hook
            if (Array.isArray(parsed)) {
              return { state: { ownedIds: new Set(parsed) }, version: 0 }
            }
            // Handle Zustand persist format
            return {
              ...parsed,
              state: { ...parsed.state, ownedIds: new Set(parsed.state.ownedIds) },
            }
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          const serialized = {
            ...value,
            state: { ...value.state, ownedIds: [...value.state.ownedIds] },
          }
          localStorage.setItem(name, JSON.stringify(serialized))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)
