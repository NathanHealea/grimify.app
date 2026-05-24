import type { SupabaseClient } from '@supabase/supabase-js'

import type { Army } from '@/modules/armies/types/army'
import type { ArmyNode } from '@/modules/armies/types/army-node'

/**
 * Creates an army service bound to the given Supabase client.
 *
 * Encapsulates all read queries for the self-referential `armies` table.
 * Armies are hierarchical: root alliances have `parent_id = null`, factions
 * are direct children of alliances, and sub-factions are children of factions.
 *
 * Use the `.server.ts` wrapper to obtain an instance with the correct client.
 *
 * @param supabase - A Supabase client instance (server or browser).
 * @returns An object with army query methods.
 */
export function createArmyService(supabase: SupabaseClient) {
  return {
    /**
     * Fetches all root alliances (armies with no parent) ordered by `sort_order`.
     *
     * @returns Array of root armies sorted by `sort_order` ascending (nulls last),
     *   then by `name`, or an empty array on error.
     */
    async getRootArmies(): Promise<Army[]> {
      const { data } = await supabase
        .from('armies')
        .select('*')
        .is('parent_id', null)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })

      return data ?? []
    },

    /**
     * Fetches all direct children of a given parent army.
     *
     * @param parentId - The UUID of the parent army.
     * @returns Array of child armies sorted by `sort_order` ascending (nulls last),
     *   then by `name`, or an empty array on error.
     */
    async getChildArmies(parentId: string): Promise<Army[]> {
      const { data } = await supabase
        .from('armies')
        .select('*')
        .eq('parent_id', parentId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })

      return data ?? []
    },

    /**
     * Fetches all armies as a flat list ordered by `sort_order`, then `name`.
     *
     * Used to build trees in JavaScript and to populate flat combobox lists.
     *
     * @returns Array of all armies sorted by `sort_order` ascending (nulls last),
     *   then by `name`, or an empty array on error.
     */
    async getAllArmiesFlat(): Promise<Army[]> {
      const { data } = await supabase
        .from('armies')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })

      return data ?? []
    },

    /**
     * Fetches a single army by ID, including its parent army if one exists.
     *
     * @param id - The UUID of the army to fetch.
     * @returns The army with an embedded `parent` field (or `null` for roots),
     *   or `null` if not found.
     */
    async getArmyById(id: string): Promise<(Army & { parent: Army | null }) | null> {
      const { data } = await supabase
        .from('armies')
        .select('*, parent:armies!parent_id(*)')
        .eq('id', id)
        .single()

      return data
    },

    /**
     * Builds a nested {@link ArmyNode} tree from all armies in the database.
     *
     * Fetches all armies via {@link getAllArmiesFlat} and assembles them into a
     * recursive tree in JavaScript — no recursive SQL CTE needed.
     *
     * @returns Array of root {@link ArmyNode} entries, each with their `children`
     *   recursively populated.
     */
    async getArmyTree(): Promise<ArmyNode[]> {
      const all = await this.getAllArmiesFlat()

      const nodeMap = new Map<string, ArmyNode>()
      for (const army of all) {
        nodeMap.set(army.id, { ...army, children: [] })
      }

      const roots: ArmyNode[] = []
      for (const node of nodeMap.values()) {
        if (node.parent_id === null) {
          roots.push(node)
        } else {
          const parent = nodeMap.get(node.parent_id)
          if (parent) {
            parent.children.push(node)
          }
        }
      }

      return roots
    },
  }
}

/** The army service instance type. */
export type ArmyService = ReturnType<typeof createArmyService>
