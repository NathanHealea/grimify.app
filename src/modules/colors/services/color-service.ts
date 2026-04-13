import type { SupabaseClient } from '@supabase/supabase-js'

import type { IttenHue } from '@/types/color'

/**
 * Creates a color service bound to the given Supabase client.
 *
 * Encapsulates all queries for the self-referencing Itten hue table.
 * Top-level hues have `parent_id = null`; child entries (named colors)
 * have `parent_id` set to their parent hue.
 *
 * Use the `.server.ts` or `.client.ts` wrappers to obtain an instance
 * with the correct client.
 *
 * @param supabase - A Supabase client instance (server or browser).
 * @returns An object with color query methods.
 */
export function createColorService(supabase: SupabaseClient) {
  return {
    /**
     * Fetches all top-level Itten hues ordered by their color wheel position.
     *
     * @returns Array of top-level hues sorted by `sort_order`, or an empty array on error.
     */
    async getIttenHues(): Promise<IttenHue[]> {
      const { data } = await supabase
        .from('itten_hues')
        .select('*')
        .is('parent_id', null)
        .order('sort_order', { ascending: true })

      return data ?? []
    },

    /**
     * Fetches a single Itten hue entry by ID (works for both top-level hues and child colors).
     *
     * @param id - The hue's UUID.
     * @returns The Itten hue, or `null` if not found.
     */
    async getIttenHueById(id: string): Promise<IttenHue | null> {
      const { data } = await supabase
        .from('itten_hues')
        .select('*')
        .eq('id', id)
        .single()

      return data
    },

    /**
     * Fetches all child hues (named colors) that belong to a given parent hue.
     *
     * @param parentId - The parent hue's UUID.
     * @returns Array of child hues ordered by name, or an empty array on error.
     */
    async getChildHues(parentId: string): Promise<IttenHue[]> {
      const { data } = await supabase
        .from('itten_hues')
        .select('*')
        .eq('parent_id', parentId)
        .order('name')

      return data ?? []
    },
  }
}

/** The color service instance type. */
export type ColorService = ReturnType<typeof createColorService>
