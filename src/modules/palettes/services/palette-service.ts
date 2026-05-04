import type { SupabaseClient } from '@supabase/supabase-js'

import type { Palette } from '@/modules/palettes/types/palette'
import type { PalettePaint } from '@/modules/palettes/types/palette-paint'
import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

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
        .select('*, palette_paints(position, paint_id, note, added_at, paints(*, product_lines(*, brands(*))))')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) return null

      type RawPalettePaint = {
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
          paint_type: string | null
          product_lines: {
            id: number
            name: string
            brands: { id: number; name: string }
          }
        } | null
      }

      const rawPaints = (data.palette_paints as unknown as RawPalettePaint[]) ?? []

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
        paints,
      }
    },

    /**
     * Lists all palettes owned by the given user, ordered by most recently
     * updated first.
     *
     * Includes up to five hex swatch previews per palette.
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
          .slice(0, 5)
          .map((pp) => pp.paints?.hex ?? '')
          .filter(Boolean),
        updatedAt: row.updated_at,
      }))
    },

    /**
     * Lists public palettes, paginated.
     *
     * Ordered by most recently updated first. Default page size is 24.
     *
     * @param opts.limit - Max rows to return (default 24).
     * @param opts.offset - Row offset for pagination (default 0).
     * @returns Array of {@link PaletteSummary} rows.
     */
    async listPublicPalettes(opts?: { limit?: number; offset?: number }): Promise<PaletteSummary[]> {
      const limit = opts?.limit ?? 24
      const offset = opts?.offset ?? 0

      const { data, error } = await supabase
        .from('palettes')
        .select('id, name, is_public, updated_at, palette_paints(paint_id, paints(hex))')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

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
          .slice(0, 5)
          .map((pp) => pp.paints?.hex ?? '')
          .filter(Boolean),
        updatedAt: row.updated_at,
      }))
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
      paints: Array<{ position: number; paintId: string; note?: string | null }>,
    ): Promise<{ error?: string }> {
      const rows = paints.map((p) => ({
        position: p.position,
        paint_id: p.paintId,
        note: p.note ?? null,
      }))

      const { error } = await supabase.rpc('replace_palette_paints', {
        p_palette_id: id,
        p_rows: rows,
      })

      if (error) return { error: error.message }
      return {}
    },
  }
}

/** The palette service instance type. */
export type PaletteService = ReturnType<typeof createPaletteService>
