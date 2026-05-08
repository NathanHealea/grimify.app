import type { SupabaseClient } from '@supabase/supabase-js'

import type { Recipe } from '@/modules/recipes/types/recipe'
import type { RecipeNote } from '@/modules/recipes/types/recipe-note'
import type { RecipePhoto } from '@/modules/recipes/types/recipe-photo'
import type { RecipeSection } from '@/modules/recipes/types/recipe-section'
import type { RecipeStep } from '@/modules/recipes/types/recipe-step'
import type { RecipeStepPaint } from '@/modules/recipes/types/recipe-step-paint'
import type { RecipeSummary } from '@/modules/recipes/types/recipe-summary'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

const RECIPE_PHOTOS_BUCKET = 'recipe-photos'

/**
 * Creates a recipe service bound to the given Supabase client.
 *
 * All `recipes`, `recipe_sections`, `recipe_steps`, `recipe_step_paints`,
 * `recipe_notes`, and `recipe_photos` queries are encapsulated here. Use the
 * `.server.ts` or `.client.ts` wrappers to obtain an instance with the
 * correct client type.
 *
 * @param supabase - A Supabase client instance (server or browser).
 * @returns An object with recipe query and mutation methods.
 */
export function createRecipeService(supabase: SupabaseClient) {
  /**
   * Resolves a public URL for an object in the `recipe-photos` bucket.
   *
   * The bucket is public, so this just stamps the configured Supabase URL
   * onto the storage path — no network round-trip.
   */
  const publicUrlFor = (storagePath: string): string =>
    supabase.storage.from(RECIPE_PHOTOS_BUCKET).getPublicUrl(storagePath).data.publicUrl

  return {
    /**
     * Fetches a single recipe by ID, fully hydrated with sections, steps,
     * step paints, notes, and photos.
     *
     * Joins the entire tree in one Supabase request and sorts each child
     * collection by `position` ascending. Returns `null` when the recipe does
     * not exist or is not visible to the caller (RLS enforced).
     *
     * @param id - The recipe UUID.
     * @returns The hydrated {@link Recipe}, or `null` if not found.
     */
    async getRecipeById(id: string): Promise<Recipe | null> {
      const { data, error } = await supabase
        .from('recipes')
        .select(
          `
          *,
          recipe_sections(
            id, recipe_id, position, title,
            recipe_steps(
              id, section_id, position, title, technique, instructions,
              recipe_step_paints(
                id, step_id, position, paint_id, palette_slot_id, ratio, note,
                paints(*, product_lines(*, brands(*)))
              )
            )
          ),
          recipe_notes(id, recipe_id, step_id, position, body, created_at),
          recipe_photos(id, recipe_id, step_id, position, storage_path, width_px, height_px, caption, created_at)
        `,
        )
        .eq('id', id)
        .maybeSingle()

      if (error || !data) return null

      type RawPaintJoin = {
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

      type RawStepPaint = {
        id: string
        step_id: string
        position: number
        paint_id: string
        palette_slot_id: string | null
        ratio: string | null
        note: string | null
        paints: RawPaintJoin
      }

      type RawStep = {
        id: string
        section_id: string
        position: number
        title: string | null
        technique: string | null
        instructions: string | null
        recipe_step_paints: RawStepPaint[]
      }

      type RawSection = {
        id: string
        recipe_id: string
        position: number
        title: string
        recipe_steps: RawStep[]
      }

      type RawNote = {
        id: string
        recipe_id: string | null
        step_id: string | null
        position: number
        body: string
        created_at: string
      }

      type RawPhoto = {
        id: string
        recipe_id: string | null
        step_id: string | null
        position: number
        storage_path: string
        width_px: number | null
        height_px: number | null
        caption: string | null
        created_at: string
      }

      type RawRecipe = {
        id: string
        user_id: string
        palette_id: string | null
        title: string
        summary: string | null
        cover_photo_id: string | null
        is_public: boolean
        created_at: string
        updated_at: string
        recipe_sections: RawSection[]
        recipe_notes: RawNote[]
        recipe_photos: RawPhoto[]
      }

      const raw = data as unknown as RawRecipe

      const mapStepPaint = (row: RawStepPaint): RecipeStepPaint => {
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
          id: row.id,
          stepId: row.step_id,
          position: row.position,
          paintId: row.paint_id,
          paletteSlotId: row.palette_slot_id,
          ratio: row.ratio,
          note: row.note,
          paint,
        }
      }

      const mapStep = (row: RawStep): RecipeStep => ({
        id: row.id,
        sectionId: row.section_id,
        position: row.position,
        title: row.title,
        technique: row.technique,
        instructions: row.instructions,
        paints: (row.recipe_step_paints ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map(mapStepPaint),
      })

      const mapSection = (row: RawSection): RecipeSection => ({
        id: row.id,
        recipeId: row.recipe_id,
        position: row.position,
        title: row.title,
        steps: (row.recipe_steps ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map(mapStep),
      })

      const mapNote = (row: RawNote): RecipeNote => ({
        id: row.id,
        recipeId: row.recipe_id,
        stepId: row.step_id,
        position: row.position,
        body: row.body,
        createdAt: row.created_at,
      })

      const mapPhoto = (row: RawPhoto): RecipePhoto => ({
        id: row.id,
        recipeId: row.recipe_id,
        stepId: row.step_id,
        position: row.position,
        storagePath: row.storage_path,
        url: publicUrlFor(row.storage_path),
        widthPx: row.width_px,
        heightPx: row.height_px,
        caption: row.caption,
        createdAt: row.created_at,
      })

      const sections = (raw.recipe_sections ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map(mapSection)

      const allNotes = (raw.recipe_notes ?? []).slice().sort((a, b) => a.position - b.position)
      const allPhotos = (raw.recipe_photos ?? []).slice().sort((a, b) => a.position - b.position)

      return {
        id: raw.id,
        userId: raw.user_id,
        paletteId: raw.palette_id,
        title: raw.title,
        summary: raw.summary,
        coverPhotoId: raw.cover_photo_id,
        isPublic: raw.is_public,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
        sections,
        notes: allNotes.filter((n) => n.recipe_id !== null).map(mapNote),
        photos: allPhotos.filter((p) => p.recipe_id !== null).map(mapPhoto),
      }
    },

    /**
     * Lists all recipes owned by the given user, ordered by most recently
     * updated first.
     *
     * Each summary includes the cover photo URL (when set) and a step count
     * derived from the nested section/step join.
     *
     * @param userId - The authenticated user's UUID.
     * @returns Array of {@link RecipeSummary} rows.
     */
    async listRecipesForUser(userId: string): Promise<RecipeSummary[]> {
      const { data, error } = await supabase
        .from('recipes')
        .select(
          `
          id, title, is_public, updated_at, cover_photo_id,
          cover:recipe_photos!recipes_cover_photo_id_fkey(storage_path),
          recipe_sections(recipe_steps(id))
        `,
        )
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error || !data) return []

      type RawRow = {
        id: string
        title: string
        is_public: boolean
        updated_at: string
        cover_photo_id: string | null
        cover: { storage_path: string } | null
        recipe_sections: { recipe_steps: { id: string }[] }[]
      }

      return (data as unknown as RawRow[]).map((row) => ({
        id: row.id,
        title: row.title,
        isPublic: row.is_public,
        stepCount: (row.recipe_sections ?? []).reduce(
          (n, s) => n + (s.recipe_steps?.length ?? 0),
          0,
        ),
        coverPhotoUrl: row.cover ? publicUrlFor(row.cover.storage_path) : null,
        updatedAt: row.updated_at,
      }))
    },

    /**
     * Lists public recipes, paginated.
     *
     * Ordered by most recently updated first. Default page size is 24. Each
     * row is augmented with the owner's profile display name so catalog cards
     * can credit the author.
     *
     * @param opts.limit - Max rows to return (default 24).
     * @param opts.offset - Row offset for pagination (default 0).
     * @returns Array of {@link RecipeSummary} rows with `ownerDisplayName` populated.
     */
    async listPublicRecipes(opts?: { limit?: number; offset?: number }): Promise<RecipeSummary[]> {
      const limit = opts?.limit ?? 24
      const offset = opts?.offset ?? 0

      const { data, error } = await supabase
        .from('recipes')
        .select(
          `
          id, title, is_public, updated_at, cover_photo_id,
          profiles(display_name),
          cover:recipe_photos!recipes_cover_photo_id_fkey(storage_path),
          recipe_sections(recipe_steps(id))
        `,
        )
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error || !data) return []

      type RawRow = {
        id: string
        title: string
        is_public: boolean
        updated_at: string
        cover_photo_id: string | null
        profiles: { display_name: string | null } | null
        cover: { storage_path: string } | null
        recipe_sections: { recipe_steps: { id: string }[] }[]
      }

      return (data as unknown as RawRow[]).map((row) => ({
        id: row.id,
        title: row.title,
        isPublic: row.is_public,
        stepCount: (row.recipe_sections ?? []).reduce(
          (n, s) => n + (s.recipe_steps?.length ?? 0),
          0,
        ),
        coverPhotoUrl: row.cover ? publicUrlFor(row.cover.storage_path) : null,
        updatedAt: row.updated_at,
        ownerDisplayName: row.profiles?.display_name ?? null,
      }))
    },

    /**
     * Returns the total count of recipes with `is_public = true`.
     *
     * Used for paginating the public catalog at `/recipes`.
     *
     * @returns The count, or `0` on error.
     */
    async countPublicRecipes(): Promise<number> {
      const { count, error } = await supabase
        .from('recipes')
        .select('id', { count: 'exact', head: true })
        .eq('is_public', true)

      if (error) return 0
      return count ?? 0
    },

    /**
     * Creates a new empty recipe for the given user.
     *
     * Sections, steps, paints, notes, and photos start empty — the recipe
     * builder fills them in via subsequent mutations.
     *
     * @param input.userId - The owner's UUID.
     * @param input.title - Recipe title (1–120 chars). Defaults to `"Untitled recipe"` upstream.
     * @param input.summary - Optional summary (max 5000 chars).
     * @param input.paletteId - Optional palette to pin.
     * @param input.isPublic - Whether the recipe is publicly visible (default `false`).
     * @returns The created {@link Recipe} with empty children.
     */
    async createRecipe(input: {
      userId: string
      title: string
      summary?: string | null
      paletteId?: string | null
      isPublic?: boolean
    }): Promise<Recipe> {
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          user_id: input.userId,
          title: input.title,
          summary: input.summary ?? null,
          palette_id: input.paletteId ?? null,
          is_public: input.isPublic ?? false,
        })
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to create recipe')

      return {
        id: data.id,
        userId: data.user_id,
        paletteId: data.palette_id,
        title: data.title,
        summary: data.summary,
        coverPhotoId: data.cover_photo_id,
        isPublic: data.is_public,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        sections: [],
        notes: [],
        photos: [],
      }
    },

    /**
     * Updates a recipe's metadata fields.
     *
     * Only the provided fields are patched. The `set_updated_at` trigger keeps
     * `updated_at` current. The caller is responsible for ensuring
     * `coverPhotoId` references a photo whose `recipe_id` equals this recipe.
     *
     * @param id - The recipe UUID.
     * @param patch - Fields to update.
     * @returns The updated {@link Recipe} with empty children (call `getRecipeById` for hydration).
     */
    async updateRecipe(
      id: string,
      patch: {
        title?: string
        summary?: string | null
        paletteId?: string | null
        isPublic?: boolean
        coverPhotoId?: string | null
      },
    ): Promise<Recipe> {
      const { data, error } = await supabase
        .from('recipes')
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.summary !== undefined && { summary: patch.summary }),
          ...(patch.paletteId !== undefined && { palette_id: patch.paletteId }),
          ...(patch.isPublic !== undefined && { is_public: patch.isPublic }),
          ...(patch.coverPhotoId !== undefined && { cover_photo_id: patch.coverPhotoId }),
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to update recipe')

      return {
        id: data.id,
        userId: data.user_id,
        paletteId: data.palette_id,
        title: data.title,
        summary: data.summary,
        coverPhotoId: data.cover_photo_id,
        isPublic: data.is_public,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        sections: [],
        notes: [],
        photos: [],
      }
    },

    /**
     * Hard-deletes a recipe. Cascades to all sections, steps, step paints,
     * notes, and photo rows.
     *
     * Storage objects in the `recipe-photos` bucket are not removed here —
     * cleanup is the responsibility of the photo-management feature
     * (see `03-recipe-photos`).
     *
     * @param id - The recipe UUID.
     */
    async deleteRecipe(id: string): Promise<void> {
      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
  }
}

/** The recipe service instance type. */
export type RecipeService = ReturnType<typeof createRecipeService>
