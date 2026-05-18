import type { SupabaseClient } from '@supabase/supabase-js'

import type { Palette } from '@/modules/palettes/types/palette'
import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import type { PaletteGroupPaint } from '@/modules/palettes/types/palette-group-paint'
import type { PalettePaint } from '@/modules/palettes/types/palette-paint'
import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Creates a palette service bound to the given Supabase client.
 *
 * All `palettes`, `palette_paints`, `palette_groups`, and `palette_group_paints`
 * queries are encapsulated here. Use the `.server.ts` or `.client.ts` wrappers
 * to obtain an instance with the correct client type.
 *
 * @param supabase - A Supabase client instance (server or browser).
 * @returns An object with palette query and mutation methods.
 */
export function createPaletteService(supabase: SupabaseClient) {
  return {
    /**
     * Fetches a single palette by ID, including the master paint list and all
     * group memberships.
     *
     * Master paints are ordered by `position` ascending. Each group's `paints`
     * array is ordered by membership `position` ascending and the `palettePaint`
     * field is hydrated from the already-loaded master list — no extra query.
     *
     * Returns `null` when the palette does not exist or is not visible to the
     * caller (RLS enforced).
     *
     * @param id - The palette UUID.
     * @returns The hydrated {@link Palette}, or `null` if not found.
     */
    async getPaletteById(id: string): Promise<Palette | null> {
      const { data, error } = await supabase
        .from('palettes')
        .select(
          '*, ' +
          'palette_groups(id, name, position, created_at, palette_group_paints(id, palette_paint_id, position, added_at)), ' +
          'palette_paints(id, position, paint_id, note, added_at, paints(*, product_lines(*, brands(*))))',
        )
        .eq('id', id)
        .maybeSingle()

      if (error || !data) return null

      type RawGroupPaint = {
        id: string
        palette_paint_id: string
        position: number
        added_at: string
      }

      type RawPaletteGroup = {
        id: string
        name: string
        position: number
        created_at: string
        palette_group_paints: RawGroupPaint[]
      }

      type RawPalettePaint = {
        id: string
        position: number
        paint_id: string
        note: string | null
        added_at: string
        paints: {
          id: string
          name: string
          hex: string
          hue: number
          saturation: number
          lightness: number
          hue_id: string | null
          is_metallic: boolean
          is_discontinued: boolean
          paint_type: string | null
          product_lines: {
            id: number
            name: string
            brands: { id: number; name: string }
          }
        } | null
      }

      type RawPaletteData = {
        id: string
        user_id: string
        name: string
        description: string | null
        is_public: boolean
        created_at: string
        updated_at: string
        palette_groups: RawPaletteGroup[]
        palette_paints: RawPalettePaint[]
      }

      const raw = data as unknown as RawPaletteData
      const rawGroups = raw.palette_groups ?? []
      const rawPaints = raw.palette_paints ?? []

      const paints: PalettePaint[] = rawPaints
        .sort((a, b) => a.position - b.position)
        .map((row) => {
          const p = row.paints
          const paint: ColorWheelPaint | undefined = p
            ? {
                id: p.id,
                name: p.name,
                hex: p.hex,
                hue: p.hue,
                saturation: p.saturation,
                lightness: p.lightness,
                hue_id: p.hue_id,
                is_metallic: p.is_metallic,
                is_discontinued: p.is_discontinued ?? false,
                paint_type: p.paint_type,
                brand_name: p.product_lines.brands.name,
                product_line_name: p.product_lines.name,
                brand_id: String(p.product_lines.brands.id),
                product_line_id: String(p.product_lines.id),
              }
            : undefined

          return {
            id: row.id,
            position: row.position,
            paintId: row.paint_id,
            note: row.note,
            addedAt: row.added_at,
            paint,
          }
        })

      // Build a lookup from palettePaintId → PalettePaint for membership hydration.
      const paintById = new Map(paints.map((p) => [p.id, p]))

      const groups: PaletteGroup[] = rawGroups
        .sort((a, b) => a.position - b.position)
        .map((row) => {
          const groupPaints: PaletteGroupPaint[] = (row.palette_group_paints ?? [])
            .sort((a, b) => a.position - b.position)
            .map((gp) => ({
              id: gp.id,
              groupId: row.id,
              palettePaintId: gp.palette_paint_id,
              position: gp.position,
              addedAt: gp.added_at,
              palettePaint: paintById.get(gp.palette_paint_id),
            }))

          return {
            id: row.id,
            paletteId: id,
            name: row.name,
            position: row.position,
            createdAt: row.created_at,
            paints: groupPaints,
          }
        })

      return {
        id: raw.id,
        userId: raw.user_id,
        name: raw.name,
        description: raw.description,
        isPublic: raw.is_public,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
        groups,
        paints,
      }
    },

    /**
     * Lists all palettes owned by the given user, ordered by most recently
     * updated first.
     *
     * Includes up to eight hex swatch previews per palette.
     *
     * @param userId - The authenticated user's UUID.
     * @returns Array of {@link PaletteSummary} rows.
     */
    async listPalettesForUser(userId: string): Promise<PaletteSummary[]> {
      const { data, error } = await supabase
        .from('palettes')
        .select('id, name, is_public, updated_at, palette_paints(paint_id, paints(hex))')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error || !data) return []

      type RawSummaryRow = {
        id: string
        name: string
        is_public: boolean
        updated_at: string
        palette_paints: { paint_id: string; paints: { hex: string } | null }[]
      }

      return (data as unknown as RawSummaryRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        isPublic: row.is_public,
        paintCount: row.palette_paints.length,
        swatches: row.palette_paints
          .slice(0, 8)
          .map((pp) => pp.paints?.hex ?? '')
          .filter(Boolean),
        updatedAt: row.updated_at,
      }))
    },

    /**
     * Lists public palettes, paginated.
     *
     * Ordered by most recently updated first. Default page size is 24. Each
     * row is augmented with the owner's profile display name so catalog cards
     * can credit the author.
     *
     * @param opts.limit - Max rows to return (default 24).
     * @param opts.offset - Row offset for pagination (default 0).
     * @returns Array of {@link PaletteSummary} rows with `ownerDisplayName` populated.
     */
    async listPublicPalettes(opts?: { limit?: number; offset?: number }): Promise<PaletteSummary[]> {
      const limit = opts?.limit ?? 24
      const offset = opts?.offset ?? 0

      const { data, error } = await supabase
        .from('palettes')
        .select('id, name, is_public, updated_at, profiles(display_name), palette_paints(paint_id, paints(hex))')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error || !data) return []

      type RawSummaryRow = {
        id: string
        name: string
        is_public: boolean
        updated_at: string
        profiles: { display_name: string | null } | null
        palette_paints: { paint_id: string; paints: { hex: string } | null }[]
      }

      return (data as unknown as RawSummaryRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        isPublic: row.is_public,
        paintCount: row.palette_paints.length,
        swatches: row.palette_paints
          .slice(0, 8)
          .map((pp) => pp.paints?.hex ?? '')
          .filter(Boolean),
        updatedAt: row.updated_at,
        ownerDisplayName: row.profiles?.display_name ?? null,
      }))
    },

    /**
     * Returns the total count of palettes with `is_public = true`.
     *
     * Used for paginating the public catalog at `/palettes`.
     *
     * @returns The count, or `0` on error.
     */
    async countPublicPalettes(): Promise<number> {
      const { count, error } = await supabase
        .from('palettes')
        .select('id', { count: 'exact', head: true })
        .eq('is_public', true)

      if (error) return 0
      return count ?? 0
    },

    /**
     * Creates a new palette for the given user.
     *
     * @param input.userId - The owner's UUID.
     * @param input.name - Palette name (1–80 chars).
     * @param input.description - Optional description (max 1000 chars).
     * @param input.isPublic - Whether the palette is publicly visible.
     * @returns The created {@link Palette} with empty `paints` and `groups` arrays.
     */
    async createPalette(input: {
      userId: string
      name: string
      description?: string | null
      isPublic?: boolean
    }): Promise<Palette> {
      const { data, error } = await supabase
        .from('palettes')
        .insert({
          user_id: input.userId,
          name: input.name,
          description: input.description ?? null,
          is_public: input.isPublic ?? false,
        })
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to create palette')

      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        isPublic: data.is_public,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        groups: [],
        paints: [],
      }
    },

    /**
     * Updates a palette's name, description, or visibility.
     *
     * Only `name`, `description`, and `is_public` are patched. The
     * `set_updated_at` trigger keeps `updated_at` current.
     *
     * @param id - The palette UUID.
     * @param patch - Fields to update.
     * @returns The updated {@link Palette} with empty `paints` and `groups` arrays.
     */
    async updatePalette(
      id: string,
      patch: { name?: string; description?: string | null; isPublic?: boolean },
    ): Promise<Palette> {
      const { data, error } = await supabase
        .from('palettes')
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.isPublic !== undefined && { is_public: patch.isPublic }),
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to update palette')

      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        isPublic: data.is_public,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        groups: [],
        paints: [],
      }
    },

    /**
     * Hard-deletes a palette. Cascades to all `palette_paints` and
     * `palette_group_paints` rows.
     *
     * @param id - The palette UUID.
     */
    async deletePalette(id: string): Promise<void> {
      const { error } = await supabase.from('palettes').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },

    /**
     * Reorders the master paint list for a palette using the id-based RPC.
     *
     * Calls `reorder_palette_paints_v2` which shifts positions by the current
     * row count to vacate the target range before re-assigning. Group memberships
     * are not affected.
     *
     * @param paletteId - UUID of the palette.
     * @param palettePaintIds - Stable `palette_paints.id` values in the desired order.
     * @returns An object with an optional `error` string on failure.
     */
    async reorderMasterList(
      paletteId: string,
      palettePaintIds: string[],
    ): Promise<{ error?: string }> {
      const { error } = await supabase.rpc('reorder_palette_paints_v2', {
        p_palette_id: paletteId,
        p_palette_paint_ids: palettePaintIds,
      })
      if (error) return { error: error.message }
      return {}
    },

    /**
     * Appends a single paint to the end of a palette's master list.
     *
     * Inserts directly into `palette_paints` at `position = (current count)`.
     * Rejects with `code: 'duplicate'` when the paint already exists in the
     * palette — enforced by both the application check and the schema-level
     * `UNIQUE (palette_id, paint_id)` constraint.
     *
     * @param paletteId - UUID of the palette to modify.
     * @param paintId - UUID of the paint to append.
     * @param note - Optional per-slot note.
     * @returns The new `palettePaintId`, or an error.
     */
    async appendPaintToPalette(
      paletteId: string,
      paintId: string,
      note?: string | null,
    ): Promise<{ palettePaintId?: string; error?: string; code?: 'duplicate' | 'not_found' }> {
      // Count current slots to determine next position.
      const { count, error: countError } = await supabase
        .from('palette_paints')
        .select('id', { count: 'exact', head: true })
        .eq('palette_id', paletteId)

      if (countError) return { error: countError.message }

      const { data, error } = await supabase
        .from('palette_paints')
        .insert({
          palette_id: paletteId,
          paint_id: paintId,
          note: note ?? null,
          position: count ?? 0,
        })
        .select('id')
        .single()

      if (error) {
        if (error.code === '23505') {
          return { error: 'This paint is already in the palette.', code: 'duplicate' }
        }
        return { error: error.message }
      }

      return { palettePaintId: data.id }
    },

    /**
     * Appends an ordered list of paints to the end of a palette in one transaction.
     *
     * Rejects the entire call with `code: 'duplicate'` when any input paint already
     * exists in the palette OR appears more than once in the input list.
     *
     * @param paletteId - UUID of the palette to modify.
     * @param paintIds - Ordered list of paint UUIDs to append.
     * @returns An object with an optional `error` string, `code` discriminator, and `duplicateIds` list.
     */
    async appendPaintsToPalette(
      paletteId: string,
      paintIds: string[],
    ): Promise<{ error?: string; code?: 'duplicate' | 'not_found'; duplicateIds?: string[] }> {
      // Load existing master list to check for duplicates.
      const { data: existing, error: existingError } = await supabase
        .from('palette_paints')
        .select('paint_id, id')
        .eq('palette_id', paletteId)

      if (existingError) return { error: existingError.message }

      const existingPaintIds = new Set((existing ?? []).map((row) => row.paint_id as string))
      const seen = new Set<string>()
      const duplicates: string[] = []
      for (const id of paintIds) {
        if (existingPaintIds.has(id) || seen.has(id)) duplicates.push(id)
        seen.add(id)
      }
      if (duplicates.length > 0) {
        return {
          error: `${duplicates.length} paint(s) are already in this palette.`,
          code: 'duplicate',
          duplicateIds: duplicates,
        }
      }

      const basePosition = existing?.length ?? 0
      const rows = paintIds.map((id, i) => ({
        palette_id: paletteId,
        paint_id: id,
        note: null as string | null,
        position: basePosition + i,
      }))

      const { error } = await supabase.from('palette_paints').insert(rows)
      if (error) {
        if (error.code === '23505') {
          return { error: 'One or more paints are already in this palette.', code: 'duplicate' }
        }
        return { error: error.message }
      }

      return {}
    },

    /**
     * Removes a single paint from the palette master list by its stable ID.
     *
     * The `ON DELETE CASCADE` on `palette_group_paints.palette_paint_id` removes
     * every group membership for this paint automatically. After deletion,
     * remaining master-list positions are renumbered via `reorder_palette_paints_v2`.
     *
     * @param paletteId - UUID of the palette.
     * @param palettePaintId - Stable UUID of the master-list entry to remove.
     * @returns An object with an optional `error` string on failure.
     */
    async removePalettePaint(
      paletteId: string,
      palettePaintId: string,
    ): Promise<{ error?: string }> {
      const { error: deleteError } = await supabase
        .from('palette_paints')
        .delete()
        .eq('id', palettePaintId)
        .eq('palette_id', paletteId)

      if (deleteError) return { error: deleteError.message }

      // Re-fetch remaining ids in position order and renumber.
      const { data: remaining, error: fetchError } = await supabase
        .from('palette_paints')
        .select('id')
        .eq('palette_id', paletteId)
        .order('position', { ascending: true })

      if (fetchError) return { error: fetchError.message }

      const ids = (remaining ?? []).map((row) => row.id as string)
      if (ids.length === 0) return {}

      return this.reorderMasterList(paletteId, ids)
    },

    /**
     * Creates a new group at the end of the palette's group list.
     *
     * The `position` is set to `(current max + 1)` so the group appends last.
     *
     * @param paletteId - UUID of the parent palette.
     * @param name - Display name for the group (1–100 characters).
     * @returns The created {@link PaletteGroup} with an empty `paints` array, or an `error`.
     */
    async createPaletteGroup(
      paletteId: string,
      name: string,
    ): Promise<{ group?: PaletteGroup; error?: string }> {
      const { data: existing } = await supabase
        .from('palette_groups')
        .select('position')
        .eq('palette_id', paletteId)
        .order('position', { ascending: false })
        .limit(1)

      const maxPosition = existing && existing.length > 0 ? existing[0].position : -1

      const { data, error } = await supabase
        .from('palette_groups')
        .insert({ palette_id: paletteId, name, position: maxPosition + 1 })
        .select()
        .single()

      if (error || !data) return { error: error?.message ?? 'Failed to create group' }

      return {
        group: {
          id: data.id,
          paletteId: data.palette_id,
          name: data.name,
          position: data.position,
          createdAt: data.created_at,
          paints: [],
        },
      }
    },

    /**
     * Updates a group's name.
     *
     * @param groupId - UUID of the group to update.
     * @param patch.name - New display name.
     * @returns The updated {@link PaletteGroup} with an empty `paints` array, or an `error`.
     */
    async updatePaletteGroup(
      groupId: string,
      patch: { name?: string },
    ): Promise<{ group?: PaletteGroup; error?: string }> {
      const { data, error } = await supabase
        .from('palette_groups')
        .update({ ...(patch.name !== undefined && { name: patch.name }) })
        .eq('id', groupId)
        .select()
        .single()

      if (error || !data) return { error: error?.message ?? 'Failed to update group' }

      return {
        group: {
          id: data.id,
          paletteId: data.palette_id,
          name: data.name,
          position: data.position,
          createdAt: data.created_at,
          paints: [],
        },
      }
    },

    /**
     * Deletes a group. All {@link PaletteGroupPaint} memberships cascade-delete
     * via the FK `ON DELETE CASCADE` — master-list entries are untouched.
     *
     * @param groupId - UUID of the group to delete.
     * @returns An object with an optional `error` string on failure.
     */
    async deletePaletteGroup(groupId: string): Promise<{ error?: string }> {
      const { error } = await supabase.from('palette_groups').delete().eq('id', groupId)
      if (error) return { error: error.message }
      return {}
    },

    /**
     * Batch-updates the `position` of each group in the supplied ordered list.
     *
     * Group counts are small, so a sequence of single-row UPDATEs is used
     * rather than a dedicated RPC.
     *
     * @param _paletteId - UUID of the parent palette (kept for action-layer ownership checks).
     * @param ordered - Array of `{ id, position }` pairs reflecting the new order.
     * @returns An object with an optional `error` string on first failure.
     */
    async reorderPaletteGroups(
      _paletteId: string,
      ordered: Array<{ id: string; position: number }>,
    ): Promise<{ error?: string }> {
      for (const entry of ordered) {
        const { error } = await supabase
          .from('palette_groups')
          .update({ position: entry.position })
          .eq('id', entry.id)
        if (error) return { error: error.message }
      }
      return {}
    },

    /**
     * Adds a master-list paint to a group, creating a new {@link PaletteGroupPaint}
     * membership row at the end of the group.
     *
     * The operation is idempotent: if the paint is already a member of the group,
     * the insert is silently ignored (`ON CONFLICT DO NOTHING`).
     *
     * @param groupId - UUID of the target group.
     * @param palettePaintId - Stable UUID of the master-list entry to add.
     * @returns An object with an optional `error` string on failure.
     */
    async addPaintToGroup(
      groupId: string,
      palettePaintId: string,
    ): Promise<{ error?: string }> {
      // Use MAX(position)+1 so gaps left by deletions never cause a collision.
      const { data: maxRow, error: maxError } = await supabase
        .from('palette_group_paints')
        .select('position')
        .eq('group_id', groupId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (maxError) return { error: maxError.message }

      const nextPosition = maxRow == null ? 0 : maxRow.position + 1

      const { error } = await supabase
        .from('palette_group_paints')
        .upsert(
          { group_id: groupId, palette_paint_id: palettePaintId, position: nextPosition },
          { onConflict: 'group_id,palette_paint_id', ignoreDuplicates: true },
        )

      if (error) return { error: error.message }
      return {}
    },

    /**
     * Removes a paint's membership from a group without touching the master list.
     *
     * @param groupId - UUID of the group.
     * @param palettePaintId - Stable UUID of the master-list entry to remove from the group.
     * @returns An object with an optional `error` string on failure.
     */
    async removePaintFromGroup(
      groupId: string,
      palettePaintId: string,
    ): Promise<{ error?: string }> {
      const { error } = await supabase
        .from('palette_group_paints')
        .delete()
        .eq('group_id', groupId)
        .eq('palette_paint_id', palettePaintId)

      if (error) return { error: error.message }
      return {}
    },

    /**
     * Reorders the membership rows within a single group.
     *
     * Calls `reorder_palette_group_paints` which uses the negative-offset trick
     * to avoid firing the deferred `UNIQUE (group_id, position)` constraint
     * mid-update.
     *
     * @param groupId - UUID of the group.
     * @param palettePaintIds - Stable `palette_paints.id` values in the desired order.
     * @returns An object with an optional `error` string on failure.
     */
    async reorderGroupPaints(
      groupId: string,
      palettePaintIds: string[],
    ): Promise<{ error?: string }> {
      const { error } = await supabase.rpc('reorder_palette_group_paints', {
        p_group_id: groupId,
        p_palette_paint_ids: palettePaintIds,
      })
      if (error) return { error: error.message }
      return {}
    },
  }
}

/** The palette service instance type. */
export type PaletteService = ReturnType<typeof createPaletteService>
