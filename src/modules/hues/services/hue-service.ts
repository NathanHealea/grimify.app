import type { SupabaseClient } from '@supabase/supabase-js'

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
  }
}

/** The hue service instance type. */
export type HueService = ReturnType<typeof createHueService>
