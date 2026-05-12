import type { SupabaseClient } from '@supabase/supabase-js'

import { createPaletteService } from '@/modules/palettes/services/palette-service'
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

  /**
   * Best-effort batch delete of objects in the `recipe-photos` bucket.
   *
   * Storage failures are logged via console.warn rather than thrown —
   * deletion paths in this service have already removed the parent rows
   * by the time this runs, so propagating the error would leave the
   * caller in a half-state. Orphaned blobs can be reclaimed later.
   */
  const deleteStorageObjects = async (paths: string[]): Promise<void> => {
    if (paths.length === 0) return
    const { error } = await supabase.storage.from(RECIPE_PHOTOS_BUCKET).remove(paths)
    if (error) {
      console.warn('[recipe-service] failed to remove storage objects', {
        count: paths.length,
        error: error.message,
      })
    }
  }

  /**
   * Reads every `storage_path` under a recipe — direct recipe-level
   * photos plus all step-level photos for steps in any of the recipe's
   * sections. Used by {@link deleteRecipe} to capture the cleanup set
   * before the SQL cascade runs.
   */
  const collectStoragePathsForRecipe = async (recipeId: string): Promise<string[]> => {
    const [recipeLevel, stepLevel] = await Promise.all([
      supabase.from('recipe_photos').select('storage_path').eq('recipe_id', recipeId),
      supabase
        .from('recipe_photos')
        .select('storage_path, recipe_steps!inner(section_id, recipe_sections!inner(recipe_id))')
        .eq('recipe_steps.recipe_sections.recipe_id', recipeId),
    ])

    const paths = new Set<string>()
    for (const row of recipeLevel.data ?? []) {
      const path = (row as { storage_path: string }).storage_path
      if (path) paths.add(path)
    }
    for (const row of stepLevel.data ?? []) {
      const path = (row as { storage_path: string }).storage_path
      if (path) paths.add(path)
    }
    return Array.from(paths)
  }

  /**
   * Reads every `storage_path` for photos attached to steps in a
   * given section. Used by {@link deleteSection} so cascade deletes
   * leave no orphaned blobs.
   */
  const collectStoragePathsForSection = async (sectionId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('recipe_photos')
      .select('storage_path, recipe_steps!inner(section_id)')
      .eq('recipe_steps.section_id', sectionId)

    const paths = new Set<string>()
    for (const row of data ?? []) {
      const path = (row as { storage_path: string }).storage_path
      if (path) paths.add(path)
    }
    return Array.from(paths)
  }

  /**
   * Reads every `storage_path` for photos attached to a single step.
   */
  const collectStoragePathsForStep = async (stepId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('recipe_photos')
      .select('storage_path')
      .eq('step_id', stepId)

    return (data ?? [])
      .map((row) => (row as { storage_path: string }).storage_path)
      .filter((path): path is string => Boolean(path))
  }

  return {
    /**
     * Fetches a single recipe by ID, fully hydrated with sections, steps,
     * step paints, notes, photos, and the linked palette (when set).
     *
     * Joins the recipe tree in one Supabase request and sorts each child
     * collection by `position` ascending. When `palette_id` is set, makes a
     * second round-trip via the palette service so the returned `palette` is
     * visible to the step-paint picker and detail view without further calls.
     * Returns `null` when the recipe does not exist or is not visible to the
     * caller (RLS enforced).
     *
     * @remarks
     * **Live-join deferral**: The doc plan for `02-recipe-step-paints` calls
     * for hydrating each step paint's "current" `paint_id` via a live join
     * through `palette_slot_id`. The `palette_paints` table does not yet
     * expose a stable slot identifier (its PK is `(palette_id, position)`),
     * so this read returns the **denormalized** `paint_id` from
     * `recipe_step_paints` directly. AC #8 of the feature doc — palette swaps
     * propagating into step paints — is parked until a future migration adds
     * a `slot_id` column and rewrites the `replace_palette_paints` RPC to
     * preserve it across reorders.
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
              ),
              recipe_photos!recipe_photos_step_id_fkey(id, recipe_id, step_id, position, storage_path, width_px, height_px, caption, created_at),
              recipe_notes!recipe_notes_step_id_fkey(id, recipe_id, step_id, position, body, created_at)
            )
          ),
          recipe_notes!recipe_notes_recipe_id_fkey(id, recipe_id, step_id, position, body, created_at),
          recipe_photos!recipe_photos_recipe_id_fkey(id, recipe_id, step_id, position, storage_path, width_px, height_px, caption, created_at)
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
        is_discontinued: boolean
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

      type RawNote = {
        id: string
        recipe_id: string | null
        step_id: string | null
        position: number
        body: string
        created_at: string
      }

      type RawStep = {
        id: string
        section_id: string
        position: number
        title: string | null
        technique: string | null
        instructions: string | null
        recipe_step_paints: RawStepPaint[]
        recipe_photos: RawPhoto[]
        recipe_notes: RawNote[]
      }

      type RawSection = {
        id: string
        recipe_id: string
        position: number
        title: string
        recipe_steps: RawStep[]
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
          stepId: row.step_id,
          position: row.position,
          paintId: row.paint_id,
          paletteSlotId: row.palette_slot_id,
          ratio: row.ratio,
          note: row.note,
          paint,
        }
      }

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

      const mapNote = (row: RawNote): RecipeNote => ({
        id: row.id,
        recipeId: row.recipe_id,
        stepId: row.step_id,
        position: row.position,
        body: row.body,
        createdAt: row.created_at,
      })

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
        photos: (row.recipe_photos ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map(mapPhoto),
        notes: (row.recipe_notes ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map(mapNote),
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

      const sections = (raw.recipe_sections ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map(mapSection)

      const allNotes = (raw.recipe_notes ?? []).slice().sort((a, b) => a.position - b.position)
      const allPhotos = (raw.recipe_photos ?? []).slice().sort((a, b) => a.position - b.position)

      const palette = raw.palette_id
        ? await createPaletteService(supabase).getPaletteById(raw.palette_id)
        : null

      return {
        id: raw.id,
        userId: raw.user_id,
        paletteId: raw.palette_id,
        palette,
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
        palette: null,
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
        palette: null,
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
     * notes, and photo rows, then removes every Storage object that backed
     * those photos.
     *
     * Postgres `ON DELETE CASCADE` only deletes DB rows — Storage objects
     * have to be cleaned up explicitly. We capture every `storage_path`
     * under the recipe (recipe-level photos plus all step-level photos)
     * before issuing the SQL delete, then batch-remove them from the
     * `recipe-photos` bucket after the cascade. A best-effort Storage
     * remove failure is swallowed so the DB delete still succeeds — the
     * orphaned blobs can be reclaimed by a follow-up sweep if needed.
     *
     * @param id - The recipe UUID.
     */
    async deleteRecipe(id: string): Promise<void> {
      const paths = await collectStoragePathsForRecipe(id)

      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw new Error(error.message)

      await deleteStorageObjects(paths)
    },

    /**
     * Appends a new section at the end of a recipe.
     *
     * Reads the current max `position` for the recipe and inserts at
     * `max + 1` (or `0` when the recipe has no sections yet). The composite
     * unique constraint `(recipe_id, position)` guarantees the row lands in
     * a fresh slot.
     *
     * @param recipeId - UUID of the parent recipe.
     * @param title - Section heading (1–120 chars).
     * @returns The newly created section with an empty `steps` array.
     */
    async addSection(recipeId: string, title: string): Promise<RecipeSection> {
      const { data: existing, error: existingError } = await supabase
        .from('recipe_sections')
        .select('position')
        .eq('recipe_id', recipeId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingError) throw new Error(existingError.message)

      const nextPosition = existing ? existing.position + 1 : 0

      const { data, error } = await supabase
        .from('recipe_sections')
        .insert({ recipe_id: recipeId, position: nextPosition, title })
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to add section')

      return {
        id: data.id,
        recipeId: data.recipe_id,
        position: data.position,
        title: data.title,
        steps: [],
      }
    },

    /**
     * Updates a section's mutable fields.
     *
     * Currently only `title` is patchable here. Position changes go through
     * {@link setSections} so the renumber stays atomic.
     *
     * @param id - The section UUID.
     * @param patch - Fields to update.
     * @returns The updated section with an empty `steps` array.
     */
    async updateSection(
      id: string,
      patch: { title?: string },
    ): Promise<RecipeSection> {
      const { data, error } = await supabase
        .from('recipe_sections')
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to update section')

      return {
        id: data.id,
        recipeId: data.recipe_id,
        position: data.position,
        title: data.title,
        steps: [],
      }
    },

    /**
     * Hard-deletes a section. Cascades to all steps, step paints, and any
     * notes/photos attached to those steps. Storage objects backing those
     * step-level photos are removed after the cascade.
     *
     * Caller is responsible for renumbering remaining sibling sections via
     * {@link setSections} after deletion to close the position gap.
     *
     * @param id - The section UUID.
     */
    async deleteSection(id: string): Promise<void> {
      const paths = await collectStoragePathsForSection(id)

      const { error } = await supabase.from('recipe_sections').delete().eq('id', id)
      if (error) throw new Error(error.message)

      await deleteStorageObjects(paths)
    },

    /**
     * Atomically renumbers sections within a recipe.
     *
     * Performs a two-phase position update: first shifts each row to a
     * negative offset (`-1 - i`) to dodge the `(recipe_id, position)` unique
     * constraint, then assigns the requested final positions. Both phases
     * run in parallel via `Promise.all` for a constant 2 round-trips of
     * concurrent updates regardless of section count.
     *
     * @param recipeId - UUID of the parent recipe.
     * @param ordered - Complete `(id, position)` mapping for every section
     *   in the recipe. Callers should pass already-normalized positions
     *   (`0..N-1`) — the helper does not renumber for you.
     * @throws When any phase fails. Partial failures may leave sections in
     *   the negative-offset intermediate state; callers should treat this
     *   as a hard error and reload from the server.
     */
    async setSections(
      recipeId: string,
      ordered: Array<{ id: string; position: number }>,
    ): Promise<void> {
      if (ordered.length === 0) return

      const phase1 = await Promise.all(
        ordered.map((row, index) =>
          supabase
            .from('recipe_sections')
            .update({ position: -1 - index })
            .eq('id', row.id)
            .eq('recipe_id', recipeId),
        ),
      )
      const phase1Error = phase1.find((res) => res.error)?.error
      if (phase1Error) throw new Error(phase1Error.message)

      const phase2 = await Promise.all(
        ordered.map((row) =>
          supabase
            .from('recipe_sections')
            .update({ position: row.position })
            .eq('id', row.id)
            .eq('recipe_id', recipeId),
        ),
      )
      const phase2Error = phase2.find((res) => res.error)?.error
      if (phase2Error) throw new Error(phase2Error.message)
    },

    /**
     * Appends a new step at the end of a section.
     *
     * Reads the current max `position` for the section and inserts at
     * `max + 1` (or `0` when the section has no steps). All editable fields
     * are optional — a fresh step is allowed to be entirely blank, and the
     * builder hydrates them via subsequent `updateStep` calls.
     *
     * @param sectionId - UUID of the parent section.
     * @param init - Optional initial fields for the step.
     * @returns The newly created step with empty `paints` and `photos` arrays.
     */
    async addStep(
      sectionId: string,
      init?: {
        title?: string | null
        technique?: string | null
        instructions?: string | null
      },
    ): Promise<RecipeStep> {
      const { data: existing, error: existingError } = await supabase
        .from('recipe_steps')
        .select('position')
        .eq('section_id', sectionId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingError) throw new Error(existingError.message)

      const nextPosition = existing ? existing.position + 1 : 0

      const { data, error } = await supabase
        .from('recipe_steps')
        .insert({
          section_id: sectionId,
          position: nextPosition,
          title: init?.title ?? null,
          technique: init?.technique ?? null,
          instructions: init?.instructions ?? null,
        })
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to add step')

      return {
        id: data.id,
        sectionId: data.section_id,
        position: data.position,
        title: data.title,
        technique: data.technique,
        instructions: data.instructions,
        paints: [],
        photos: [],
        notes: [],
      }
    },

    /**
     * Updates a step's mutable text fields.
     *
     * Position changes go through {@link setSteps}; cross-section moves are
     * out of scope for this helper (delete + add in the new section).
     *
     * @param id - The step UUID.
     * @param patch - Fields to update. Pass `null` to clear an optional
     *   field; omit a key to leave it unchanged.
     * @returns The updated step with empty `paints` and `photos` arrays.
     */
    async updateStep(
      id: string,
      patch: {
        title?: string | null
        technique?: string | null
        instructions?: string | null
      },
    ): Promise<RecipeStep> {
      const { data, error } = await supabase
        .from('recipe_steps')
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.technique !== undefined && { technique: patch.technique }),
          ...(patch.instructions !== undefined && { instructions: patch.instructions }),
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to update step')

      return {
        id: data.id,
        sectionId: data.section_id,
        position: data.position,
        title: data.title,
        technique: data.technique,
        instructions: data.instructions,
        paints: [],
        photos: [],
        notes: [],
      }
    },

    /**
     * Hard-deletes a step. Cascades to all `recipe_step_paints` rows and any
     * notes/photos attached to the step. Storage objects backing the
     * step-level photos are removed after the cascade.
     *
     * Caller is responsible for renumbering remaining sibling steps via
     * {@link setSteps} after deletion to close the position gap.
     *
     * @param id - The step UUID.
     */
    async deleteStep(id: string): Promise<void> {
      const paths = await collectStoragePathsForStep(id)

      const { error } = await supabase.from('recipe_steps').delete().eq('id', id)
      if (error) throw new Error(error.message)

      await deleteStorageObjects(paths)
    },

    /**
     * Atomically renumbers steps within a section.
     *
     * Mirrors {@link setSections} exactly: two-phase negative-offset update
     * to dodge the `(section_id, position)` unique constraint, both phases
     * dispatched in parallel.
     *
     * @param sectionId - UUID of the parent section.
     * @param ordered - Complete `(id, position)` mapping for every step in
     *   the section. Positions should be normalized to `0..N-1`.
     * @throws When any phase fails.
     */
    async setSteps(
      sectionId: string,
      ordered: Array<{ id: string; position: number }>,
    ): Promise<void> {
      if (ordered.length === 0) return

      const phase1 = await Promise.all(
        ordered.map((row, index) =>
          supabase
            .from('recipe_steps')
            .update({ position: -1 - index })
            .eq('id', row.id)
            .eq('section_id', sectionId),
        ),
      )
      const phase1Error = phase1.find((res) => res.error)?.error
      if (phase1Error) throw new Error(phase1Error.message)

      const phase2 = await Promise.all(
        ordered.map((row) =>
          supabase
            .from('recipe_steps')
            .update({ position: row.position })
            .eq('id', row.id)
            .eq('section_id', sectionId),
        ),
      )
      const phase2Error = phase2.find((res) => res.error)?.error
      if (phase2Error) throw new Error(phase2Error.message)
    },

    /**
     * Appends a new paint to a step.
     *
     * Reads the current max `position` for the step and inserts at
     * `max + 1` (or `0` when the step has no paints). Returns a
     * `RecipeStepPaint` with the embedded {@link ColorWheelPaint} hydrated
     * from the canonical paints table.
     *
     * The `paletteSlotId` field is recorded as a free-form uuid (no FK) and
     * does not currently drive any live join — see the live-join deferral
     * note on {@link getRecipeById}.
     *
     * @param stepId - UUID of the parent step.
     * @param init - Paint reference plus optional palette context, ratio, note.
     * @returns The newly created step paint with `paint` embedded.
     */
    async addStepPaint(
      stepId: string,
      init: {
        paintId: string
        paletteSlotId?: string | null
        ratio?: string | null
        note?: string | null
      },
    ): Promise<RecipeStepPaint> {
      const { data: existing, error: existingError } = await supabase
        .from('recipe_step_paints')
        .select('position')
        .eq('step_id', stepId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingError) throw new Error(existingError.message)

      const nextPosition = existing ? existing.position + 1 : 0

      const { data, error } = await supabase
        .from('recipe_step_paints')
        .insert({
          step_id: stepId,
          position: nextPosition,
          paint_id: init.paintId,
          palette_slot_id: init.paletteSlotId ?? null,
          ratio: init.ratio ?? null,
          note: init.note ?? null,
        })
        .select(
          `
          id, step_id, position, paint_id, palette_slot_id, ratio, note,
          paints(*, product_lines(*, brands(*)))
        `,
        )
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to add step paint.')

      type RawPaintJoin = {
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

      type RawRow = {
        id: string
        step_id: string
        position: number
        paint_id: string
        palette_slot_id: string | null
        ratio: string | null
        note: string | null
        paints: RawPaintJoin
      }

      const row = data as unknown as RawRow
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
        stepId: row.step_id,
        position: row.position,
        paintId: row.paint_id,
        paletteSlotId: row.palette_slot_id,
        ratio: row.ratio,
        note: row.note,
        paint,
      }
    },

    /**
     * Updates a step paint's mutable text fields.
     *
     * Position changes go through {@link setStepPaints}. Pass `null` to
     * clear an optional field; omit a key to leave it unchanged.
     *
     * @param id - The step paint UUID.
     * @param patch - Fields to update.
     */
    async updateStepPaint(
      id: string,
      patch: { ratio?: string | null; note?: string | null },
    ): Promise<void> {
      const { error } = await supabase
        .from('recipe_step_paints')
        .update({
          ...(patch.ratio !== undefined && { ratio: patch.ratio }),
          ...(patch.note !== undefined && { note: patch.note }),
        })
        .eq('id', id)

      if (error) throw new Error(error.message)
    },

    /**
     * Hard-deletes a step paint.
     *
     * Caller is responsible for renumbering remaining sibling step paints via
     * {@link setStepPaints} after deletion to close the position gap.
     *
     * @param id - The step paint UUID.
     */
    async deleteStepPaint(id: string): Promise<void> {
      const { error } = await supabase.from('recipe_step_paints').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },

    /**
     * Atomically replaces all step paint rows for a step.
     *
     * Delegates to the `replace_recipe_step_paints` RPC, which performs
     * delete + reinsert in a single transaction and enforces ownership at
     * the database level. Use this for any reorder, bulk replace, or
     * post-delete renumber so positions never enter a gap state.
     *
     * @param stepId - UUID of the parent step.
     * @param rows - Complete payload for every paint that should exist on
     *   the step after the call. Positions should be normalized to `0..N-1`.
     * @throws When the RPC fails (auth/ownership errors raise `not_owner`).
     */
    async setStepPaints(
      stepId: string,
      rows: Array<{
        position: number
        paintId: string
        paletteSlotId: string | null
        ratio: string | null
        note: string | null
      }>,
    ): Promise<void> {
      const payload = rows.map((row) => ({
        position: row.position,
        paint_id: row.paintId,
        palette_slot_id: row.paletteSlotId ?? null,
        ratio: row.ratio,
        note: row.note,
      }))

      const { error } = await supabase.rpc('replace_recipe_step_paints', {
        p_step_id: stepId,
        p_rows: payload,
      })

      if (error) throw new Error(error.message)
    },

    /**
     * Inserts a new `recipe_photos` row for an already-uploaded Storage
     * object.
     *
     * The XOR `(recipe_id, step_id)` invariant is enforced by setting
     * exactly one of the two foreign keys based on the discriminated
     * `parent` union. The row's `position` is appended to the end of the
     * parent's existing photos.
     *
     * The Storage upload itself happens client-side; this helper only
     * writes the metadata row. Callers are responsible for removing the
     * Storage object if this insert fails.
     *
     * @param input.parent - Either a `recipe` or `step` parent reference.
     * @param input.storagePath - The object key under the `recipe-photos` bucket.
     * @param input.widthPx - Decoded image width, or `null` if unknown.
     * @param input.heightPx - Decoded image height, or `null` if unknown.
     * @param input.caption - Optional initial caption (≤200 chars).
     * @returns The hydrated {@link RecipePhoto} with a public URL.
     */
    async addRecipePhoto(input: {
      parent: { kind: 'recipe'; recipeId: string } | { kind: 'step'; stepId: string }
      storagePath: string
      widthPx?: number | null
      heightPx?: number | null
      caption?: string | null
    }): Promise<RecipePhoto> {
      const recipeId = input.parent.kind === 'recipe' ? input.parent.recipeId : null
      const stepId = input.parent.kind === 'step' ? input.parent.stepId : null

      const positionFilter = supabase
        .from('recipe_photos')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
      const positionQuery =
        input.parent.kind === 'recipe'
          ? positionFilter.eq('recipe_id', input.parent.recipeId)
          : positionFilter.eq('step_id', input.parent.stepId)

      const { data: existing, error: existingError } = await positionQuery.maybeSingle()
      if (existingError) throw new Error(existingError.message)

      const nextPosition = existing ? existing.position + 1 : 0

      const { data, error } = await supabase
        .from('recipe_photos')
        .insert({
          recipe_id: recipeId,
          step_id: stepId,
          position: nextPosition,
          storage_path: input.storagePath,
          width_px: input.widthPx ?? null,
          height_px: input.heightPx ?? null,
          caption: input.caption ?? null,
        })
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to add photo.')

      return {
        id: data.id,
        recipeId: data.recipe_id,
        stepId: data.step_id,
        position: data.position,
        storagePath: data.storage_path,
        url: publicUrlFor(data.storage_path),
        widthPx: data.width_px,
        heightPx: data.height_px,
        caption: data.caption,
        createdAt: data.created_at,
      }
    },

    /**
     * Patches a photo's mutable fields. Currently only `caption` is
     * editable here (≤200 chars; pass `null` to clear). Position changes
     * route through {@link setRecipePhotos}.
     *
     * @param id - The photo UUID.
     * @param patch - Fields to update.
     * @returns The updated {@link RecipePhoto} with a public URL.
     */
    async updateRecipePhoto(
      id: string,
      patch: { caption?: string | null },
    ): Promise<RecipePhoto> {
      const { data, error } = await supabase
        .from('recipe_photos')
        .update({
          ...(patch.caption !== undefined && { caption: patch.caption }),
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to update photo.')

      return {
        id: data.id,
        recipeId: data.recipe_id,
        stepId: data.step_id,
        position: data.position,
        storagePath: data.storage_path,
        url: publicUrlFor(data.storage_path),
        widthPx: data.width_px,
        heightPx: data.height_px,
        caption: data.caption,
        createdAt: data.created_at,
      }
    },

    /**
     * Hard-deletes a photo row and removes its Storage object.
     *
     * Reads the row first so the caller does not need to provide the
     * `storage_path`, then deletes the row, then removes the Storage
     * blob (best-effort — see {@link deleteStorageObjects}). Callers
     * should renumber the remaining sibling photos via
     * {@link setRecipePhotos} afterwards if a contiguous order matters.
     *
     * @param id - The photo UUID.
     * @returns Metadata about the removed row (storage path + parent ids)
     *   so the caller can renumber siblings.
     */
    async deleteRecipePhoto(id: string): Promise<{
      storagePath: string
      recipeId: string | null
      stepId: string | null
    }> {
      const { data: row, error: readError } = await supabase
        .from('recipe_photos')
        .select('storage_path, recipe_id, step_id')
        .eq('id', id)
        .maybeSingle()

      if (readError) throw new Error(readError.message)
      if (!row) throw new Error('Photo not found.')

      const { error } = await supabase.from('recipe_photos').delete().eq('id', id)
      if (error) throw new Error(error.message)

      await deleteStorageObjects([row.storage_path as string])

      return {
        storagePath: row.storage_path as string,
        recipeId: (row.recipe_id as string | null) ?? null,
        stepId: (row.step_id as string | null) ?? null,
      }
    },

    /**
     * Renumbers photos within a recipe-level or step-level parent.
     *
     * `recipe_photos` does not enforce a `(parent_id, position)` unique
     * constraint, so a single-phase update is safe. Updates are still
     * dispatched in parallel for one round-trip per row.
     *
     * @param parent - The parent scope (recipe or step).
     * @param ordered - Complete `(id, position)` mapping for every photo
     *   in the parent. Positions should be normalized to `0..N-1`.
     * @throws When any update fails.
     */
    async setRecipePhotos(
      parent: { kind: 'recipe'; recipeId: string } | { kind: 'step'; stepId: string },
      ordered: Array<{ id: string; position: number }>,
    ): Promise<void> {
      if (ordered.length === 0) return

      const parentColumn = parent.kind === 'recipe' ? 'recipe_id' : 'step_id'
      const parentValue = parent.kind === 'recipe' ? parent.recipeId : parent.stepId

      const results = await Promise.all(
        ordered.map((row) =>
          supabase
            .from('recipe_photos')
            .update({ position: row.position })
            .eq('id', row.id)
            .eq(parentColumn, parentValue),
        ),
      )

      const failed = results.find((res) => res.error)?.error
      if (failed) throw new Error(failed.message)
    },

    /**
     * Sets (or clears) the cover photo on a recipe.
     *
     * Validates that `photoId` (when not null) references a photo whose
     * `recipe_id` equals the target recipe — step-level photos cannot
     * be covers. Updating the FK to a step-photo is rejected with
     * `'Invalid cover photo for this recipe.'`.
     *
     * @param recipeId - The recipe UUID.
     * @param photoId - Photo UUID to use as cover, or `null` to clear.
     * @throws When the photo does not belong to the recipe at the recipe level.
     */
    async setCoverPhoto(recipeId: string, photoId: string | null): Promise<void> {
      if (photoId) {
        const { data, error } = await supabase
          .from('recipe_photos')
          .select('recipe_id, step_id')
          .eq('id', photoId)
          .maybeSingle()

        if (error) throw new Error(error.message)
        if (!data || data.recipe_id !== recipeId || data.step_id !== null) {
          throw new Error('Invalid cover photo for this recipe.')
        }
      }

      const { error } = await supabase
        .from('recipes')
        .update({ cover_photo_id: photoId })
        .eq('id', recipeId)

      if (error) throw new Error(error.message)
    },

    /**
     * Appends a new note at the end of a recipe-level or step-level parent.
     *
     * The XOR `(recipe_id, step_id)` invariant is enforced by setting
     * exactly one of the two foreign keys based on the discriminated
     * `parent` union. Reads the current max `position` for that parent
     * and inserts at `max + 1` (or `0` when the parent has no notes).
     *
     * @param parent - Either a `recipe` or `step` parent reference.
     * @param body - Markdown body (1–5000 chars after trimming).
     * @returns The newly created {@link RecipeNote}.
     */
    async addNote(
      parent: { kind: 'recipe'; recipeId: string } | { kind: 'step'; stepId: string },
      body: string,
    ): Promise<RecipeNote> {
      const positionFilter = supabase
        .from('recipe_notes')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
      const positionQuery =
        parent.kind === 'recipe'
          ? positionFilter.eq('recipe_id', parent.recipeId)
          : positionFilter.eq('step_id', parent.stepId)

      const { data: existing, error: existingError } = await positionQuery.maybeSingle()
      if (existingError) throw new Error(existingError.message)

      const nextPosition = existing ? existing.position + 1 : 0

      const recipeId = parent.kind === 'recipe' ? parent.recipeId : null
      const stepId = parent.kind === 'step' ? parent.stepId : null

      const { data, error } = await supabase
        .from('recipe_notes')
        .insert({
          recipe_id: recipeId,
          step_id: stepId,
          position: nextPosition,
          body,
        })
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to add note.')

      return {
        id: data.id,
        recipeId: data.recipe_id,
        stepId: data.step_id,
        position: data.position,
        body: data.body,
        createdAt: data.created_at,
      }
    },

    /**
     * Patches a note's mutable fields. Currently only `body` is editable.
     *
     * Body must be 1–5000 chars; empty bodies should be sent as a
     * {@link deleteNote} instead.
     *
     * @param id - The note UUID.
     * @param patch - Fields to update.
     * @returns The updated {@link RecipeNote}.
     */
    async updateNote(
      id: string,
      patch: { body?: string },
    ): Promise<RecipeNote> {
      const { data, error } = await supabase
        .from('recipe_notes')
        .update({
          ...(patch.body !== undefined && { body: patch.body }),
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to update note.')

      return {
        id: data.id,
        recipeId: data.recipe_id,
        stepId: data.step_id,
        position: data.position,
        body: data.body,
        createdAt: data.created_at,
      }
    },

    /**
     * Hard-deletes a note row.
     *
     * Returns the parent ids so the caller can renumber the remaining
     * sibling notes via {@link setRecipeNotes} if a contiguous order
     * matters.
     *
     * @param id - The note UUID.
     * @returns Metadata about the removed row's parent.
     */
    async deleteNote(id: string): Promise<{
      recipeId: string | null
      stepId: string | null
    }> {
      const { data: row, error: readError } = await supabase
        .from('recipe_notes')
        .select('recipe_id, step_id')
        .eq('id', id)
        .maybeSingle()

      if (readError) throw new Error(readError.message)
      if (!row) throw new Error('Note not found.')

      const { error } = await supabase.from('recipe_notes').delete().eq('id', id)
      if (error) throw new Error(error.message)

      return {
        recipeId: (row.recipe_id as string | null) ?? null,
        stepId: (row.step_id as string | null) ?? null,
      }
    },

    /**
     * Renumbers notes within a recipe-level or step-level parent.
     *
     * `recipe_notes` does not enforce a `(parent_id, position)` unique
     * constraint, so a single-phase update is safe. Mirrors
     * {@link setRecipePhotos} exactly.
     *
     * @param parent - The parent scope (recipe or step).
     * @param ordered - Complete `(id, position)` mapping for every note
     *   in the parent. Positions should be normalized to `0..N-1`.
     * @throws When any update fails.
     */
    async setRecipeNotes(
      parent: { kind: 'recipe'; recipeId: string } | { kind: 'step'; stepId: string },
      ordered: Array<{ id: string; position: number }>,
    ): Promise<void> {
      if (ordered.length === 0) return

      const parentColumn = parent.kind === 'recipe' ? 'recipe_id' : 'step_id'
      const parentValue = parent.kind === 'recipe' ? parent.recipeId : parent.stepId

      const results = await Promise.all(
        ordered.map((row) =>
          supabase
            .from('recipe_notes')
            .update({ position: row.position })
            .eq('id', row.id)
            .eq(parentColumn, parentValue),
        ),
      )

      const failed = results.find((res) => res.error)?.error
      if (failed) throw new Error(failed.message)
    },
  }
}

/** The recipe service instance type. */
export type RecipeService = ReturnType<typeof createRecipeService>
