import type { SupabaseClient } from '@supabase/supabase-js'

import type { ColorWheelHue } from '@/modules/color-wheel/types/color-wheel-hue'
import type { Hue } from '@/types/color'

/**
 * Creates a hue service bound to the given Supabase client.
 *
 * Encapsulates all queries for the self-referencing Munsell hue table.
 * Top-level hues have `parent_id = null`; child entries (ISCC-NBS sub-hues)
 * have `parent_id` set to their parent hue.
 *
 * Use the `.server.ts` wrapper to obtain an instance with the correct client.
 *
 * @param supabase - A Supabase client instance (server or browser).
 * @returns An object with hue query methods.
 */
export function createHueService(supabase: SupabaseClient) {
  return {
    /**
     * Fetches all top-level Munsell hues ordered by their color wheel position.
     *
     * @returns Array of top-level hues sorted by `sort_order`, or an empty array on error.
     */
    async getHues(): Promise<Hue[]> {
      const { data } = await supabase
        .from('hues')
        .select('*')
        .is('parent_id', null)
        .order('sort_order', { ascending: true })

      return data ?? []
    },

    /**
     * Fetches a single hue entry by ID (works for both top-level hues and sub-hues).
     *
     * @param id - The hue's UUID.
     * @returns The hue, or `null` if not found.
     */
    async getHueById(id: string): Promise<Hue | null> {
      const { data } = await supabase
        .from('hues')
        .select('*')
        .eq('id', id)
        .single()

      return data
    },

    /**
     * Fetches all child hues (ISCC-NBS sub-hues) that belong to a given parent hue.
     *
     * @param parentId - The parent hue's UUID.
     * @returns Array of child hues ordered by name, or an empty array on error.
     */
    async getChildHues(parentId: string): Promise<Hue[]> {
      const { data } = await supabase
        .from('hues')
        .select('*')
        .eq('parent_id', parentId)
        .order('name')

      return data ?? []
    },
    /**
     * Fetches a single parent hue with its child count.
     *
     * Returns `null` if not found.
     *
     * @param id - The hue's UUID.
     * @returns The hue with `child_count`, or `null`.
     */
    async getHueWithChildCount(id: string): Promise<(Hue & { child_count: number }) | null> {
      const { data: hue } = await supabase.from('hues').select('*').eq('id', id).single()
      if (!hue) return null

      const { count } = await supabase
        .from('hues')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', id)

      return { ...hue, child_count: count ?? 0 }
    },

    /**
     * Fetches all top-level (parent) hues with child counts and paint counts.
     *
     * Used by the admin hues list page to display per-hue statistics.
     *
     * @returns Array of parent hues with `child_count` and `paint_count`.
     */
    async getParentHuesWithCounts(): Promise<(Hue & { child_count: number; paint_count: number })[]> {
      const { data: parents } = await supabase
        .from('hues')
        .select('*')
        .is('parent_id', null)
        .order('sort_order', { ascending: true })

      if (!parents || parents.length === 0) return []

      const parentIds = parents.map((h) => h.id)

      const { data: children } = await supabase
        .from('hues')
        .select('id, parent_id')
        .in('parent_id', parentIds)

      const childIdsByParent = new Map<string, string[]>()
      for (const child of children ?? []) {
        const existing = childIdsByParent.get(child.parent_id) ?? []
        existing.push(child.id)
        childIdsByParent.set(child.parent_id, existing)
      }

      const results = await Promise.all(
        parents.map(async (parent) => {
          const childIds = childIdsByParent.get(parent.id) ?? []
          const child_count = childIds.length

          let paint_count = 0
          if (childIds.length > 0) {
            const { count } = await supabase
              .from('paints')
              .select('*', { count: 'exact', head: true })
              .in('hue_id', childIds)
            paint_count = count ?? 0
          }

          return { ...parent, child_count, paint_count }
        })
      )

      return results
    },

    /**
     * Fetches all top-level Munsell hues with their ISCC-NBS child hues nested,
     * for use in color wheel sector and sub-divider rendering.
     *
     * @returns Array of {@link ColorWheelHue} sorted by sort_order, each with a
     *   populated `children` array of ISCC-NBS sub-hues sorted by name.
     */
    async getColorWheelHues(): Promise<ColorWheelHue[]> {
      const { data: parents } = await supabase
        .from('hues')
        .select('id, name, hex_code, sort_order')
        .is('parent_id', null)
        .order('sort_order', { ascending: true })

      if (!parents) return []

      const parentIds = parents.map((h) => h.id)
      const { data: children } = await supabase
        .from('hues')
        .select('id, name, hex_code, sort_order, parent_id')
        .in('parent_id', parentIds)
        .order('name', { ascending: true })

      const childMap = new Map<string, ColorWheelHue[]>()
      for (const child of children ?? []) {
        const siblings = childMap.get(child.parent_id) ?? []
        siblings.push({ id: child.id, name: child.name, hex_code: child.hex_code, sort_order: child.sort_order, children: [] })
        childMap.set(child.parent_id, siblings)
      }

      return parents.map((parent) => ({
        id: parent.id,
        name: parent.name,
        hex_code: parent.hex_code,
        sort_order: parent.sort_order,
        children: childMap.get(parent.id) ?? [],
      }))
    },
  }
}

/** The hue service instance type. */
export type HueService = ReturnType<typeof createHueService>
