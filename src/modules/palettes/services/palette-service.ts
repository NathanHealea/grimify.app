import type { SupabaseClient } from '@supabase/supabase-js'

import type { Palette } from '@/modules/palettes/types/palette'
import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import type { PalettePaint } from '@/modules/palettes/types/palette-paint'
import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { normalizePalettePositions } from '@/modules/palettes/utils/normalize-palette-positions'

/**
 * Creates a palette service bound to the given Supabase client.
 *
 * All `palettes` and `palette_paints` queries are encapsulated here. Use the
 * `.server.ts` or `.client.ts` wrappers to obtain an instance with the
 * correct client type.
 *
 * @param supabase - A Supabase client instance (server or browser).
 * @returns An object with palette query and mutation methods.
 */
export function createPaletteService(supabase: SupabaseClient) {
  return {
    /**
     * Fetches a single palette by ID, including all paint slots.
     *
     * Paint slots are ordered by `position` ascending. Returns `null` when the
     * palette does not exist or is not visible to the caller (RLS enforced).
     *
     * @param id - The palette UUID.
     * @returns The hydrated {@link Palette}, or `null` if not found.
     */
    async getPaletteById(id: string): Promise<Palette | null> {
      const { data, error } = await supabase
        .from('palettes')
        .select('*, palette_groups(id, name, position, created_at), palette_paints(position, paint_id, note, added_at, group_id, paints(*, product_lines(*, brands(*))))')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) return null

      type RawPaletteGroup = {
        id: string
        name: string
        position: number
        created_at: string
      }

      type RawPalettePaint = {
        position: number
        paint_id: string
        note: string | null
        added_at: string
        group_id: string | null
        paints: {
          id: string
          name: string
          hex: string
          hue: number
          saturation: number
          lightness: number
          hue_id: string | null
          is_metallic: boolean
          paint_type: string | null
          product_lines: {
            id: number
            name: string
            brands: { id: number; name: string }
          }
        } | null
      }

      const rawGroups = (data.palette_groups as unknown as RawPaletteGroup[]) ?? []
      const rawPaints = (data.palette_paints as unknown as RawPalettePaint[]) ?? []

      const groups: PaletteGroup[] = rawGroups
        .sort((a, b) => a.position - b.position)
        .map((row) => ({
          id: row.id,
          paletteId: id,
          name: row.name,
          position: row.position,
          createdAt: row.created_at,
        }))

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
                paint_type: p.paint_type,
                brand_name: p.product_lines.brands.name,
                product_line_name: p.product_lines.name,
                brand_id: String(p.product_lines.brands.id),
                product_line_id: String(p.product_lines.id),
              }
            : undefined

          return {
            position: row.position,
            paintId: row.paint_id,
            note: row.note,
            addedAt: row.added_at,
            groupId: row.group_id,
            paint,
          }
        })

      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        isPublic: data.is_public,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
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
     * @returns The created {@link Palette} with an empty `paints` array.
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
     * @returns The updated {@link Palette} with an empty `paints` array.
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
     * Hard-deletes a palette. Cascades to all `palette_paints` rows.
     *
     * @param id - The palette UUID.
     */
    async deletePalette(id: string): Promise<void> {
      const { error } = await supabase.from('palettes').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },

    /**
     * Atomically replaces all paint slots for a palette.
     *
     * Calls the `replace_palette_paints` database RPC so the delete and insert
     * run in a single transaction — positions never enter a gap state.
     *
     * The caller is responsible for normalizing positions to `0..N-1` before
     * calling this method (use {@link normalizePalettePositions}).
     *
     * @param id - The palette UUID.
     * @param paints - The complete new slot list.
     * @returns An object with an optional `error` string on failure.
     */
    async setPalettePaints(
      id: string,
      paints: Array<{ position: number; paintId: string; note?: string | null; groupId?: string | null }>,
    ): Promise<{ error?: string }> {
      const rows = paints.map((p) => ({
        position: p.position,
        paint_id: p.paintId,
        note: p.note ?? null,
        group_id: p.groupId ?? null,
      }))

      const { error } = await supabase.rpc('replace_palette_paints', {
        p_palette_id: id,
        p_rows: rows,
      })

      if (error) return { error: error.message }
      return {}
    },

    /**
     * Appends a single paint to the end of a palette.
     *
     * Loads the current slots, appends the new entry, normalizes positions,
     * then atomically replaces via {@link setPalettePaints}. Mirrors the
     * read-modify-write pattern used by `removePalettePaint`.
     *
     * Rejects the call with `code: 'duplicate'` when `paintId` is already in
     * the palette — the application layer enforces uniqueness because the
     * schema's composite PK is `(palette_id, position)`, not `(palette_id,
     * paint_id)`.
     *
     * @param paletteId - UUID of the palette to modify.
     * @param paintId - UUID of the paint to append.
     * @param note - Optional per-slot note (left blank when not provided).
     * @returns An object with an optional `error` string and `code` discriminator.
     */
    async appendPaintToPalette(
      paletteId: string,
      paintId: string,
      note?: string | null,
    ): Promise<{ error?: string; code?: 'duplicate' | 'not_found' }> {
      const palette = await this.getPaletteById(paletteId)
      if (!palette) return { error: 'Palette not found.', code: 'not_found' }

      if (palette.paints.some((slot) => slot.paintId === paintId)) {
        return { error: 'This paint is already in the palette.', code: 'duplicate' }
      }

      const next = normalizePalettePositions([
        ...palette.paints,
        { position: palette.paints.length, paintId, note: note ?? null },
      ])

      return this.setPalettePaints(paletteId, next)
    },

    /**
     * Appends an ordered list of paints to the end of a palette in one transaction.
     *
     * Loads the current slots, appends all entries in order, normalizes positions,
     * then atomically replaces via {@link setPalettePaints}.
     *
     * Rejects the entire call atomically with `code: 'duplicate'` when any
     * input paint already exists in the palette OR appears more than once in
     * the input list. Duplicate paint IDs are reported back via `duplicateIds`
     * so the caller can name them in user-facing feedback.
     *
     * @param paletteId - UUID of the palette to modify.
     * @param paintIds - Ordered list of paint UUIDs to append.
     * @returns An object with an optional `error` string, `code` discriminator, and `duplicateIds` list.
     */
    async appendPaintsToPalette(
      paletteId: string,
      paintIds: string[],
    ): Promise<{ error?: string; code?: 'duplicate' | 'not_found'; duplicateIds?: string[] }> {
      const palette = await this.getPaletteById(paletteId)
      if (!palette) return { error: 'Palette not found.', code: 'not_found' }

      const existing = new Set(palette.paints.map((slot) => slot.paintId))
      const seen = new Set<string>()
      const duplicates: string[] = []
      for (const id of paintIds) {
        if (existing.has(id) || seen.has(id)) duplicates.push(id)
        seen.add(id)
      }
      if (duplicates.length > 0) {
        return {
          error: `${duplicates.length} paint(s) are already in this palette.`,
          code: 'duplicate',
          duplicateIds: duplicates,
        }
      }

      const base = palette.paints.length
      const additions = paintIds.map((id, i) => ({
        position: base + i,
        paintId: id,
        note: null as string | null,
      }))

      const next = normalizePalettePositions([...palette.paints, ...additions])

      return this.setPalettePaints(paletteId, next)
    },

    /**
     * Creates a new group at the end of the palette's group list.
     *
     * The `position` is set to `(current max + 1)` so the group appends last.
     *
     * @param paletteId - UUID of the parent palette.
     * @param name - Display name for the group (1–100 characters).
     * @returns The created {@link PaletteGroup}, or an `error` string on failure.
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
        },
      }
    },

    /**
     * Updates a group's name.
     *
     * @param groupId - UUID of the group to update.
     * @param patch.name - New display name.
     * @returns The updated {@link PaletteGroup}, or an `error` string on failure.
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
        },
      }
    },

    /**
     * Deletes a group. Member paints become ungrouped (`group_id = NULL`) via
     * the `ON DELETE SET NULL` FK constraint — no paints are removed.
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
     * @param paletteId - UUID of the parent palette (unused in query but kept for
     *   action-layer ownership checks).
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
     * Assigns (or clears) the group for a single paint slot identified by
     * `(palette_id, position)`.
     *
     * @param paletteId - UUID of the parent palette.
     * @param position - 0-based slot index of the paint.
     * @param groupId - UUID of the target group, or `null` to make the paint ungrouped.
     * @returns An object with an optional `error` string on failure.
     */
    async assignPaintToGroup(
      paletteId: string,
      position: number,
      groupId: string | null,
    ): Promise<{ error?: string }> {
      const { error } = await supabase
        .from('palette_paints')
        .update({ group_id: groupId })
        .eq('palette_id', paletteId)
        .eq('position', position)

      if (error) return { error: error.message }
      return {}
    },
  }
}

/** The palette service instance type. */
export type PaletteService = ReturnType<typeof createPaletteService>
