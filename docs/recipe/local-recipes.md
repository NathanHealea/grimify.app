# Local Recipes

**Epic:** Recipe
**Type:** Feature
**Status:** Todo

## Summary

Browser-local interim implementation of the Recipe feature. Users can create, edit, and delete paint recipes stored in localStorage via a Zustand store with persistence — no authentication, no Supabase, no server-side logic. Recipes live entirely in the browser, matching the existing pattern used by `useCollectionStore` for owned paints. The data model mirrors the full Supabase schema (UUIDs, timestamps, same field names) so recipes can be migrated to the cloud when authentication is implemented.

This feature adds a third sidebar tab ("Recipes") alongside Filters and Collection, a recipe detail view for managing steps within a recipe, and an "Add to Recipe" action in the DetailPanel.

## Acceptance Criteria

- [ ] Recipe types defined at `src/types/recipe.ts` with fields matching the full feature schema (id, name, model_area, description, timestamps)
- [ ] `PaintTechnique` type defined with values: `prime`, `base`, `wash`, `layer`, `highlight`, `drybrush`, `glaze`, `contrast`, `technical`
- [ ] `useRecipeStore` Zustand store at `src/stores/useRecipeStore.ts` with localStorage persistence
- [ ] Users can create a new recipe (name required, model area and description optional)
- [ ] Users can rename and update model area/description of an existing recipe
- [ ] Users can delete a recipe (with confirmation dialog)
- [ ] Users can add a paint to a recipe from the DetailPanel ("Add to Recipe" button with technique picker)
- [ ] Users can remove a step from a recipe
- [ ] Users can reorder steps within a recipe (up/down buttons)
- [ ] Users can change the technique on each step via dropdown selector
- [ ] Users can add an optional note to each step in a recipe
- [ ] "Recipes" sidebar tab added to the vertical tab strip alongside Filters and Collection
- [ ] Recipe list panel shows all recipes with name, model area, step count, and tag badges
- [ ] Recipe detail view shows ordered steps with step number, technique badge, color swatch, paint name, brand, note, and owned indicator
- [ ] Each recipe shows owned vs total count ("You own 5/8 paints")
- [ ] Users can create, edit, and delete local tags (name + optional color)
- [ ] Users can assign/remove tags on recipes
- [ ] `SidebarTab` type updated to include `'recipes'`
- [ ] All recipe data persists across browser sessions via localStorage
- [ ] Empty state messaging when no recipes exist

## Implementation Plan

### Step 1: Create recipe and tag types

**`src/types/recipe.ts`** — New file defining the data model. Field names and structure match `docs/recipe/recipes.md` and `docs/recipe/tags.md` so data can be migrated to Supabase later. Uses `string` IDs (generated via `crypto.randomUUID()`) and ISO timestamp strings.

```typescript
export type PaintTechnique =
  | 'prime'
  | 'base'
  | 'wash'
  | 'layer'
  | 'highlight'
  | 'drybrush'
  | 'glaze'
  | 'contrast'
  | 'technical'

export const TECHNIQUE_LABELS: Record<PaintTechnique, string> = {
  prime: 'Prime',
  base: 'Base',
  wash: 'Wash',
  layer: 'Layer',
  highlight: 'Highlight',
  drybrush: 'Drybrush',
  glaze: 'Glaze',
  contrast: 'Contrast',
  technical: 'Technical',
}

export interface Recipe {
  id: string
  name: string
  model_area: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface RecipeStep {
  id: string
  recipe_id: string
  paint_id: string
  technique: PaintTechnique
  position: number
  note: string | null
  added_at: string
}

export interface Tag {
  id: string
  name: string
  color: string | null
  created_at: string
}

export interface RecipeTag {
  recipe_id: string
  tag_id: string
}

export interface RecipeWithSteps extends Recipe {
  steps: RecipeStep[]
  tags: string[]
}
```

### Step 2: Create the recipe Zustand store

**`src/stores/useRecipeStore.ts`** — New Zustand store with `persist` middleware using localStorage (same pattern as `useCollectionStore`). Storage key: `'colorwheel-recipes'`.

**State:**
- `recipes: Recipe[]`
- `recipeSteps: RecipeStep[]`
- `tags: Tag[]`
- `recipeTags: RecipeTag[]`
- `activeRecipeId: string | null` — currently viewed recipe in sidebar

**Recipe actions:**
- `createRecipe(name, model_area?, description?)` — generates UUID, sets timestamps, adds to array
- `updateRecipe(id, { name?, model_area?, description? })` — updates fields and `updated_at`
- `deleteRecipe(id)` — removes recipe, its steps, and its tag associations
- `setActiveRecipe(id | null)` — sets which recipe is shown in detail view

**Step actions:**
- `addStepToRecipe(recipeId, paintId, technique, note?)` — creates RecipeStep at next position; no-op if same paint+technique already in recipe
- `removeStepFromRecipe(recipeId, stepId)` — removes entry, re-indexes positions
- `updateStep(recipeId, stepId, { technique?, note? })` — updates technique or note
- `moveStepInRecipe(recipeId, stepId, direction: 'up' | 'down')` — swaps position with adjacent step

**Tag actions:**
- `createTag(name, color?)` — generates UUID, adds to array
- `updateTag(id, { name?, color? })` — updates fields
- `deleteTag(id)` — removes tag and all recipe-tag associations
- `addTagToRecipe(recipeId, tagId)` — creates RecipeTag association
- `removeTagFromRecipe(recipeId, tagId)` — removes association

**Selectors (exported functions):**
- `selectRecipesWithCounts(state)` — returns recipes with step count and tag IDs
- `selectActiveRecipeDetail(state)` — returns active recipe with its steps and tags, ordered by position
- `selectRecipesForPaint(state, paintId)` — returns recipes that contain a given paint (for the "Add to Recipe" UI)

### Step 3: Update SidebarTab type

**`src/types/paint.ts`** — Add `'recipes'` to the `SidebarTab` union type:

```typescript
export type SidebarTab = 'filters' | 'collection' | 'recipes'
```

### Step 4: Create RecipePanel component

**`src/components/RecipePanel.tsx`** — Main recipe sidebar content shown when the "Recipes" tab is active. Two views controlled by `activeRecipeId`:

**List view** (when `activeRecipeId` is null):
- "Create Recipe" button at top that opens an inline form (name input + optional model area input + optional description textarea + "Create" button)
- List of recipe cards, each showing:
  - Recipe name
  - Model area label (if set)
  - Step count badge
  - Tag badges (colored pills)
  - Owned count indicator ("3/5 owned") using `useCollectionStore`
  - Click to set `activeRecipeId` and enter detail view
  - Delete button (small X) that triggers confirmation dialog
- Empty state: "No recipes yet. Create one to start documenting your painting process."

**Detail view** (when `activeRecipeId` is set):
- Back button ("← All Recipes") to return to list view
- Editable recipe name (click to edit inline), model area, and description
- Tag management row: existing tag badges with remove (X), "Add Tag" button
- Owned vs total count: "You own 3/5 paints"
- Ordered list of steps in the recipe, each showing:
  - Step number (1, 2, 3...)
  - Technique badge (colored pill: e.g., blue for "Base", purple for "Wash")
  - Color swatch (div with backgroundColor)
  - Paint name and brand (icon + name)
  - Owned indicator dot (green if in collection)
  - Note field (click to edit inline, placeholder "Add note...")
  - Technique dropdown to change technique
  - Up/down reorder buttons
  - Remove button (X icon)
- Empty step list state: "No steps in this recipe. Select a paint on the wheel and click 'Add to Recipe'."

### Step 5: Add "Add to Recipe" action in DetailPanel

**`src/components/DetailPanel.tsx`** — Add an "Add to Recipe" button below the existing "Add to Collection" / "Remove from Collection" button. When clicked, shows a dropdown/popover with two parts:
1. Recipe selector — list of user's recipes with checkmarks for recipes that already contain this paint
2. Technique selector — appears after picking a recipe, lets user choose the technique for this step

Uses a Headless UI `Popover` or simple state-driven dropdown. If no recipes exist, the dropdown shows "No recipes — create one in the Recipes tab."

### Step 6: Wire up recipe sidebar tab in page.tsx

**`src/app/page.tsx`** — Three changes:

1. Add a "Recipes" button to the vertical tab strip (after Collection), following the same pattern as the existing Filters and Collection buttons.

2. Add a third `<Sidebar>` instance for the recipes tab:
   ```tsx
   <Sidebar isOpen={effectiveTab === 'recipes'} onClose={closeSidebar} title='Recipes'>
     <RecipePanel processedPaints={processedPaints} />
   </Sidebar>
   ```

3. Import `RecipePanel`.

### Affected Files

| File | Changes |
|------|---------|
| `src/types/recipe.ts` | New — Recipe, RecipeStep, PaintTechnique, Tag, RecipeTag types |
| `src/types/paint.ts` | Update `SidebarTab` to include `'recipes'` |
| `src/stores/useRecipeStore.ts` | New — recipe Zustand store with localStorage persistence |
| `src/components/RecipePanel.tsx` | New — recipe list and detail sidebar panel |
| `src/components/DetailPanel.tsx` | Add "Add to Recipe" button with recipe and technique picker |
| `src/app/page.tsx` | Add Recipes tab button, Sidebar instance, and RecipePanel import |

### Dependencies

- `useCollectionStore` — for owned paint indicators in recipe views
- `ProcessedPaint` type and processed paint data — for resolving paint IDs to display info
- Headless UI — for dropdown/popover in "Add to Recipe" UI (already installed)
- `crypto.randomUUID()` — available in all modern browsers, no polyfill needed

### Risks & Considerations

- **localStorage vs IndexedDB:** This plan uses localStorage (matching `useCollectionStore` pattern). localStorage has a ~5MB limit per origin, which is sufficient for recipe data. If storage needs grow, the Zustand persist middleware can be swapped to an IndexedDB adapter later.
- **Data migration path:** Field names and structure intentionally mirror the Supabase schema in `docs/recipe/recipes.md`. When authentication is built, a one-time migration can read localStorage data and insert it into Supabase tables.
- **Paint ID stability:** `RecipeStep.paint_id` uses the same composite ID format as `useCollectionStore` (brand-name-type). If paint IDs change, both stores need updating.
- **No projects:** This interim feature is a flat recipe list with no project grouping. Projects can be added as a separate local feature later or deferred to the Supabase implementation.
- **Tag scope:** Tags are global (not per-recipe) and shared across all recipes. The local tag list is small enough that a flat array in the store is sufficient.
- **Sidebar width:** The existing sidebar is 320px (`w-80`). Recipe detail with step numbers, technique badges, swatches, notes, and reorder buttons needs to fit this width. Use compact layouts.
- **Technique badge colors:** Each technique should have a distinct color for quick visual scanning (e.g., primer=gray, base=blue, wash=purple, layer=green, highlight=yellow, drybrush=orange, glaze=teal, contrast=red, technical=pink).
